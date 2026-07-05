import { NextRequest, NextResponse } from "next/server";
import { coreApiFetch, CoreApiError } from "../_lib/core-api";

/**
 * @deprecated Spec 0032 — picks are recorded via POST /api/arena/round (resolve).
 * Kept for backward compatibility; prefer /api/arena/round.
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
