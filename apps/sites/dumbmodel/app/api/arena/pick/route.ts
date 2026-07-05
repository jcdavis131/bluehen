import { NextRequest, NextResponse } from "next/server";
import { coreApiFetch, CoreApiError } from "../_lib/core-api";

/**
 * Rank Arena pick BFF (Spec 0029 §1.2, §3): every pick is a consented
 * exhaust event with userRef + itemText — the interaction data the
 * Rank Engine (and RANK-003/RANK-004) need. Awaited, not truly
 * fire-and-forget: game pacing tolerates the ~100ms round trip and we
 * want a real error surfaced if it fails.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const userRef = String(body.userRef ?? "").trim();
  const deckSlug = String(body.deckSlug ?? "").trim();
  const itemId = String(body.itemId ?? "").trim();
  const itemText = String(body.itemText ?? "").trim();
  const round = Number(body.round);

  if (!userRef || !deckSlug || !itemId || !itemText || !Number.isFinite(round)) {
    return NextResponse.json(
      { error: "userRef, deckSlug, itemId, itemText, round are required" },
      { status: 400 },
    );
  }

  try {
    const data = await coreApiFetch("/v1/exhaust", {
      method: "POST",
      body: JSON.stringify({
        source: "dumbmodel",
        kind: "interaction",
        consent: true,
        payload: { event: "arena-pick", userRef, deckSlug, itemId, itemText, round },
      }),
    });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    const status = e instanceof CoreApiError ? e.status : 502;
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status });
  }
}
