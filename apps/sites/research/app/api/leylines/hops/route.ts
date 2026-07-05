import { NextRequest, NextResponse } from "next/server";
import { coreApiFetch, CoreApiError } from "../_lib/core-api";
import { isRecommendResponse } from "../_lib/recommend";

/**
 * Leylines /hops (Spec 0031 §2/§7, GAME-003): the next four candidates from
 * the current node. /v1/recommend already excludes the anchor itself
 * (recommend_by_item: `chunk_id != cid`); we additionally exclude anything
 * the player has already visited this run (usedIds), then cap at 4. If the
 * graph loops back on itself this can legitimately return fewer than 4 —
 * the client renders whatever comes back rather than padding with fakes.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const currentId = String(body.currentId ?? "").trim();
  const usedIds = new Set(
    Array.isArray(body.usedIds) ? (body.usedIds as unknown[]).map((id) => String(id)) : [],
  );

  if (!currentId) {
    return NextResponse.json({ error: "currentId is required" }, { status: 400 });
  }

  try {
    const data = await coreApiFetch("/v1/recommend", {
      method: "POST",
      body: JSON.stringify({ itemId: currentId, k: 5 }),
    });
    if (!isRecommendResponse(data)) {
      return NextResponse.json({ error: "unexpected /v1/recommend response" }, { status: 502 });
    }
    const candidates = data.recommendations
      .filter((h) => !usedIds.has(h.id))
      .slice(0, 4)
      .map((h) => ({ id: h.id, title: h.title, reason: (h.reason ?? "").slice(0, 100) }));

    return NextResponse.json({ candidates });
  } catch (e) {
    const status = e instanceof CoreApiError ? e.status : 502;
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status });
  }
}
