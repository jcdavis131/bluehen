import { NextRequest, NextResponse } from "next/server";
import { coreApiFetch, CoreApiError } from "../_lib/core-api";

/**
 * Leylines /pick (Spec 0031 §2/§7, GAME-003): every hop the player takes is
 * a consented exhaust event carrying a graph edge — a-chose-b-over the
 * other candidates. Awaited (not fire-and-forget), same as arena's pick:
 * game pacing tolerates the round trip and a real error should surface.
 *
 * `player` self-declares "human" (default, the browser's hidden field) or
 * "agent" (Eve/synthorg driving this BFF directly per Spec 0031 §7 — the
 * only two accepted values; anything else collapses to "human" so
 * provenance is never accidentally mixed).
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const userRef = String(body.userRef ?? "").trim();
  const a = String(body.a ?? "").trim();
  const b = String(body.b ?? "").trim();
  const round = Number(body.round);
  const chosenOver = Array.isArray(body.chosenOver)
    ? (body.chosenOver as unknown[]).map((id) => String(id))
    : [];
  const player = body.player === "agent" ? "agent" : "human";

  if (!userRef || !a || !b || !Number.isFinite(round)) {
    return NextResponse.json(
      { error: "userRef, a, b, round are required" },
      { status: 400 },
    );
  }

  try {
    const data = await coreApiFetch("/v1/exhaust", {
      method: "POST",
      body: JSON.stringify({
        source: "research",
        kind: "interaction",
        consent: true,
        payload: {
          event: "leyline-hop",
          userRef,
          player,
          label: { kind: "edge", a, b, chosenOver },
          round,
        },
      }),
    });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    const status = e instanceof CoreApiError ? e.status : 502;
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status });
  }
}
