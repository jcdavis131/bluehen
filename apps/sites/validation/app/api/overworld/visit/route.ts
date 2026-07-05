import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@synthaembed/ui-fleet/site-api";

export const dynamic = "force-dynamic";

/**
 * Visit exhaust BFF (Spec 0033 V0): fired once per session after the
 * player dismisses the intro dialog's consent-light line. Same player
 * convention as the rest of the trio (Spec 0031 §7) — the web UI always
 * sends "human"; scripted/agent callers hitting this same public BFF
 * self-declare "agent".
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const userRef = String(body.userRef ?? "").trim();
  const player = body.player === "agent" ? "agent" : "human";
  if (!userRef) {
    return NextResponse.json({ error: "userRef is required" }, { status: 400 });
  }

  try {
    await apiFetch("/v1/exhaust", {
      method: "POST",
      body: JSON.stringify({
        source: "validation",
        kind: "interaction",
        consent: true,
        payload: { event: "overworld-visit", userRef, player },
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("SYNTH_API_KEY") ? 503 : 502;
    return NextResponse.json({ error: msg }, { status });
  }

  return NextResponse.json({ recorded: true });
}
