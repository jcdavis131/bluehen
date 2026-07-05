import { NextResponse } from "next/server";
import { apiFetch } from "@synthaembed/ui-fleet/site-api";
import { pickProbeQuery } from "../_lib/queries";

export const dynamic = "force-dynamic";

type SearchHit = {
  id?: unknown;
  payload?: { text?: unknown; title?: unknown } | null;
};

type SearchResponse = { hits?: SearchHit[] };

function hitId(hit: SearchHit, fallbackIndex: number): string {
  const id = hit.id;
  if (typeof id === "string" && id) return id;
  if (typeof id === "number") return String(id);
  return `hit-${fallbackIndex}`;
}

function hitText(hit: SearchHit): string {
  const payload = (hit.payload ?? {}) as Record<string, unknown>;
  const text = typeof payload.text === "string" ? payload.text : "";
  if (text.trim()) return text.slice(0, 260);
  const title = typeof payload.title === "string" ? payload.title : "";
  return title.trim() || "(no passage text available)";
}

/**
 * GET a Verdict case (Spec 0031 §2/§7 GAME-004): fire a real probe query at
 * /v1/search (k=8, live — never simulated), then pick one hit from the
 * top of the ranking (1-3) and one from the middle (4-8) so the pair is
 * never a coin flip. Side (A/B) is randomized and ranks are never sent
 * to the client — the player judges relevance, not position.
 */
const SEARCH_BASE = process.env.SYNTH_API_BASE_URL ?? "http://localhost:8000";

async function searchFetch(body: unknown): Promise<unknown> {
  const key = process.env.SEARCH_API_KEY ?? process.env.SYNTH_API_KEY;
  if (!key) throw new Error("no API key configured");
  const res = await fetch(`${SEARCH_BASE}/v1/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`search failed (${res.status})`);
  return res.json();
}

export async function GET() {
  const query = pickProbeQuery();

  try {
    const data = (await searchFetch({ query, k: 8 })) as SearchResponse;

    const hits = Array.isArray(data.hits) ? data.hits : [];
    if (hits.length < 2) {
      return NextResponse.json(
        { error: "not enough retrieved hits to build a case" },
        { status: 502 },
      );
    }

    const topPool = hits.slice(0, 3);
    const bottomPool = hits.slice(3, 8);

    let topIndex: number;
    let bottomIndex: number;
    if (topPool.length > 0 && bottomPool.length > 0) {
      topIndex = Math.floor(Math.random() * topPool.length);
      bottomIndex = 3 + Math.floor(Math.random() * bottomPool.length);
    } else {
      // Upstream returned fewer than 4 hits — fall back to first vs. last
      // so the case still contrasts a stronger and a weaker match.
      topIndex = 0;
      bottomIndex = hits.length - 1;
    }

    const topHit = hits[topIndex];
    const bottomHit = hits[bottomIndex];
    const topId = hitId(topHit, topIndex);
    const bottomId = hitId(bottomHit, bottomIndex);

    if (topId === bottomId) {
      return NextResponse.json(
        { error: "not enough distinct hits to build a case" },
        { status: 502 },
      );
    }

    const exhibits = [
      { id: topId, text: hitText(topHit) },
      { id: bottomId, text: hitText(bottomHit) },
    ];
    // Randomize which exhibit lands on A vs. B — never reveal which one
    // was the higher-ranked hit.
    if (Math.random() < 0.5) exhibits.reverse();

    return NextResponse.json({
      caseId: crypto.randomUUID(),
      query,
      a: exhibits[0],
      b: exhibits[1],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("SYNTH_API_KEY") ? 503 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
