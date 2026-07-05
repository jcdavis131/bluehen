import { NextRequest, NextResponse } from "next/server";
import { arenaRateLimit } from "../../_lib/rate-limit";
import { coreApiFetch, CoreApiError } from "../_lib/core-api";

/**
 * Blind Rank round BFF: predict + resolve via /v1/rank/round.
 * Resolve always stores anonymous exhaust (no consent checkbox).
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const userRef = String(body.userRef ?? "").trim();
  const limit = arenaRateLimit(req, userRef || undefined);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: limit.retryAfter },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }
  const pair = body.pair;
  const query = body.query != null ? String(body.query) : undefined;
  const priorPicks = body.priorPicks;
  const chosenId = body.chosenId != null ? String(body.chosenId) : undefined;
  const deckSlug = body.deckSlug != null ? String(body.deckSlug) : undefined;
  const round = body.round != null ? Number(body.round) : undefined;
  const mode = String(body.mode ?? "predict");

  if (!userRef || !Array.isArray(pair) || pair.length !== 2) {
    return NextResponse.json(
      { error: "userRef and pair (two items) are required" },
      { status: 400 },
    );
  }

  if (mode === "resolve" && !chosenId) {
    return NextResponse.json({ error: "chosenId required for resolve" }, { status: 400 });
  }

  try {
    const payload: Record<string, unknown> = {
      userRef,
      pair,
      query,
      priorPicks: Array.isArray(priorPicks) ? priorPicks : [],
      deckSlug,
      round,
    };
    if (mode === "resolve" && chosenId) {
      payload.chosenId = chosenId;
    }

    const data = await coreApiFetch("/v1/rank/round", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof CoreApiError ? e.status : 502;
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status });
  }
}
