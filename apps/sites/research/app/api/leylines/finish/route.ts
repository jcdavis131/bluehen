import { NextRequest, NextResponse } from "next/server";
import { coreApiFetch, CoreApiError } from "../_lib/core-api";
import { isRecommendResponse } from "../_lib/recommend";

/** Score floor for a hop whose target doesn't show up in the anchor's
 * top-25 neighbors at all — a real (low) number, not a fabricated one. */
const MISSING_FLOOR = 0.3;

type PerHop = { a: string; b: string; score: number; matched: boolean };

async function scoreHop(a: string, b: string): Promise<PerHop> {
  try {
    const data = await coreApiFetch("/v1/recommend", {
      method: "POST",
      body: JSON.stringify({ itemId: a, k: 25 }),
    });
    if (!isRecommendResponse(data)) {
      return { a, b, score: MISSING_FLOOR, matched: false };
    }
    const hit = data.recommendations.find((h) => h.id === b);
    if (!hit) return { a, b, score: MISSING_FLOOR, matched: false };
    return { a, b, score: hit.score, matched: true };
  } catch (e) {
    // A 404 means `a` itself dropped out of the index between hops (rare,
    // small corpora) — that's a "missing" edge, honestly floored. Anything
    // else (auth, upstream down) is a real failure and should surface.
    if (e instanceof CoreApiError && e.status === 404) {
      return { a, b, score: MISSING_FLOOR, matched: false };
    }
    throw e;
  }
}

/**
 * Leylines /finish (Spec 0031 §2/§7, GAME-003): score the built path for
 * real, against the deployed model — never simulated (Spec 0031 §5).
 * pathScore = mean pairwise /v1/recommend score across consecutive hops
 * (missing target -> 0.3 floor). final applies a small bonus for reaching
 * the goal in fewer hops: pathScore * (1 + (6 - hops) * 0.05).
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const path = Array.isArray(body.path) ? (body.path as unknown[]).map((id) => String(id)) : [];
  const userRef = String(body.userRef ?? "").trim();
  const player = body.player === "agent" ? "agent" : "human";

  if (!userRef || path.length < 2) {
    return NextResponse.json(
      { error: "userRef is required and path needs at least two papers" },
      { status: 400 },
    );
  }

  try {
    const perHop: PerHop[] = [];
    // Sequential, not Promise.all: each call is a real /v1/recommend hit
    // against a rate-limited endpoint (60/min) and paths max out at 6 hops
    // anyway, so there's no real latency win worth the burst.
    for (let i = 0; i < path.length - 1; i++) {
      perHop.push(await scoreHop(path[i], path[i + 1]));
    }

    const hops = perHop.length;
    const pathScore = perHop.reduce((sum, h) => sum + h.score, 0) / hops;
    const final = pathScore * (1 + (6 - hops) * 0.05);

    try {
      await coreApiFetch("/v1/exhaust", {
        method: "POST",
        body: JSON.stringify({
          source: "research",
          kind: "interaction",
          consent: true,
          payload: {
            event: "leyline-path",
            userRef,
            player,
            label: { kind: "path", path, score: Number(final.toFixed(4)) },
          },
        }),
      });
    } catch {
      // The score is real and already computed; don't fail the player's
      // result over a telemetry write hiccup.
    }

    return NextResponse.json({
      pathScore: Number(pathScore.toFixed(4)),
      final: Number(final.toFixed(4)),
      perHop: perHop.map((h) => ({ ...h, score: Number(h.score.toFixed(4)) })),
    });
  } catch (e) {
    const status = e instanceof CoreApiError ? e.status : 502;
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status });
  }
}
