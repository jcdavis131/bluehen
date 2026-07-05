import { NextRequest, NextResponse } from "next/server";

/**
 * Player Impact BFF (Spec GAME-002): relays to the real Rank Engine's
 * /v1/games/impact with an optional userRef so a player can see their own
 * contribution counts (triplets mined in Beat the Baseline, picks and
 * verdicts from the Shapley Arena, ...) alongside fleet-wide totals and a
 * pseudonymous leaderboard — refs are pre-masked server-side by the API,
 * never de-anonymized here.
 *
 * Same bearer-authed, server-only pattern as api/arena/_lib/core-api.ts
 * and api/beat/_lib/core-api.ts (dumbmodel's own workspace key), inlined
 * here since this BFF is a single route.
 */
const BASE_URL = process.env.SYNTH_API_BASE_URL ?? "http://localhost:8000";

class CoreApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function coreApiFetch(path: string): Promise<unknown> {
  const apiKey = process.env.SYNTH_API_KEY;
  if (!apiKey) {
    throw new CoreApiError("SYNTH_API_KEY not set for dumbmodel's workspace", 503);
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });
  const raw = await res.text();
  let data: unknown = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }
  if (!res.ok) {
    const detail =
      data && typeof data === "object" && "detail" in (data as Record<string, unknown>)
        ? String((data as Record<string, unknown>).detail)
        : raw || `${res.status}`;
    throw new CoreApiError(detail, res.status);
  }
  return data;
}

export async function GET(req: NextRequest) {
  const userRef = req.nextUrl.searchParams.get("userRef")?.trim();
  const qs = userRef ? `?userRef=${encodeURIComponent(userRef)}` : "";

  try {
    const data = await coreApiFetch(`/v1/games/impact${qs}`);
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof CoreApiError ? e.status : 502;
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status });
  }
}
