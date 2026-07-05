import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@synthaembed/ui-fleet/site-api";

export const dynamic = "force-dynamic";

type SearchHit = { id?: unknown };
type SearchResponse = { hits?: SearchHit[] };

/**
 * POST a verdict (Spec 0031 §2/§7 GAME-004): records a margin-ranking
 * preference as consented exhaust, then reveals whether the player's
 * pick matches the *current* live ranking for the same query.
 *
 * Player convention (Spec 0031 §7, shared across the trio of games):
 * every game event carries player: "human" | "agent" in its exhaust
 * label. The web UI here always sends "human"; agent players (Eve/
 * synthorg or any scripted caller hitting this same public BFF) must
 * self-declare "agent" — never mixed silently, since downstream MTNN
 * training weights human data above agent data.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const userRef = String(body.userRef ?? "").trim();
  const caseId = String(body.caseId ?? "").trim();
  const query = String(body.query ?? "").trim();
  const winnerId = String(body.winnerId ?? "").trim();
  const loserId = String(body.loserId ?? "").trim();
  const player = body.player === "agent" ? "agent" : "human";

  if (!userRef || !caseId || !query || !winnerId || !loserId) {
    return NextResponse.json(
      { error: "userRef, caseId, query, winnerId, loserId are required" },
      { status: 400 },
    );
  }
  if (winnerId === loserId) {
    return NextResponse.json({ error: "winnerId and loserId must differ" }, { status: 400 });
  }

  // Re-run the same probe query against the live index rather than caching
  // the original case server-side: the reveal reflects the current
  // ranking (Spec 0031 §5 — real evals, never simulated), and it means
  // this BFF stays stateless across serverless instances.
  let engineAgreed = false;
  try {
    const data = (await apiFetch("/v1/search", {
      method: "POST",
      body: JSON.stringify({ query, k: 8 }),
    })) as SearchResponse;
    const hits = Array.isArray(data.hits) ? data.hits : [];
    const winnerIndex = hits.findIndex((h) => String(h.id ?? "") === winnerId);
    const loserIndex = hits.findIndex((h) => String(h.id ?? "") === loserId);
    if (winnerIndex !== -1 && loserIndex !== -1) {
      engineAgreed = winnerIndex < loserIndex;
    } else if (winnerIndex !== -1) {
      // Winner still ranks; loser fell out of the top 8 entirely.
      engineAgreed = true;
    } else if (loserIndex !== -1) {
      // Loser still ranks; winner fell out of the top 8 entirely.
      engineAgreed = false;
    }
    // If neither hit is found (ranking shifted enough that both dropped
    // out), engineAgreed stays false — an honest "can't confirm" default
    // rather than a fabricated match.
  } catch {
    // A failed reference search shouldn't block recording the verdict —
    // fall back to the honest-default false above.
  }

  try {
    await apiFetch("/v1/exhaust", {
      method: "POST",
      body: JSON.stringify({
        source: "validation",
        kind: "interaction",
        consent: true,
        payload: {
          event: "verdict",
          userRef,
          player,
          label: { kind: "ranking", query, winner: winnerId, loser: loserId },
        },
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("SYNTH_API_KEY") ? 503 : 502;
    return NextResponse.json({ error: msg }, { status });
  }

  return NextResponse.json({ recorded: true, engineAgreed });
}
