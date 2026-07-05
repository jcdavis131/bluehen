import { NextRequest, NextResponse } from "next/server";
import { arenaRateLimit } from "../../_lib/rate-limit";
import { coreApiFetch, CoreApiError } from "../_lib/core-api";

type RevealItem = { id?: unknown; text?: unknown };

/**
 * The Reveal BFF (Spec 0029 §1.3): relays to the real Rank Engine
 * (/v1/rank) with the just-completed session's userRef — real
 * machinery, no pretend personalization. Response (ranked, personalized,
 * candidateCount, policy) is relayed verbatim so the client can render
 * the honest note when personalized is false.
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

  const query = body.query != null ? String(body.query).trim() : undefined;
  const items = Array.isArray(body.items)
    ? (body.items as RevealItem[])
        .map((it) => ({ id: String(it.id ?? ""), text: String(it.text ?? "") }))
        .filter((it) => it.id && it.text)
    : [];

  if (!userRef || items.length === 0) {
    return NextResponse.json({ error: "userRef and items are required" }, { status: 400 });
  }

  try {
    const data = await coreApiFetch("/v1/rank", {
      method: "POST",
      body: JSON.stringify({ items, userRef, query, k: 24 }),
    });
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof CoreApiError ? e.status : 502;
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status });
  }
}
