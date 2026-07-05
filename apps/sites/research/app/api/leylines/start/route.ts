import { NextResponse } from "next/server";
import { coreApiFetch, CoreApiError } from "../_lib/core-api";
import { isRecommendResponse, pickHit, pickTopic, type RecommendHit } from "../_lib/recommend";

export const dynamic = "force-dynamic";

type Node = { id: string; title: string };

async function recommendByText(probe: string): Promise<RecommendHit[]> {
  const data = await coreApiFetch("/v1/recommend", {
    method: "POST",
    body: JSON.stringify({ text: probe, k: 6 }),
  });
  if (!isRecommendResponse(data)) return [];
  return data.recommendations;
}

/**
 * Leylines /start (Spec 0031 §2/§7, GAME-003): two random papers, far apart.
 * Two /v1/recommend text queries against different topic probes, one hit
 * from each. A handful of retries guards the (rare, small-corpus) case
 * where both probes land on the same paper.
 */
export async function GET() {
  try {
    let start: Node | null = null;
    let goal: Node | null = null;
    let usedTopic = "";

    for (let attempt = 0; attempt < 4 && (!start || !goal || start.id === goal.id); attempt++) {
      const topicA = pickTopic();
      const topicB = pickTopic(topicA);
      usedTopic = `${topicA} / ${topicB}`;

      const [hitsA, hitsB] = await Promise.all([recommendByText(topicA), recommendByText(topicB)]);
      const a = pickHit(hitsA);
      const b = pickHit(hitsB, a?.id);
      if (a && b && a.id !== b.id) {
        // Trim to {id, title} — only the shape the game exposes to the client.
        start = { id: a.id, title: a.title };
        goal = { id: b.id, title: b.title };
      }
    }

    if (!start || !goal) {
      return NextResponse.json(
        { error: `couldn't find two distinct papers to bridge (last tried: ${usedTopic})` },
        { status: 503 },
      );
    }

    return NextResponse.json({
      start,
      goal,
      sessionSeed: crypto.randomUUID().slice(0, 12),
    });
  } catch (e) {
    const status = e instanceof CoreApiError ? e.status : 502;
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status });
  }
}
