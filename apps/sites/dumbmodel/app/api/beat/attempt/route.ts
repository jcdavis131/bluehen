import { NextRequest, NextResponse } from "next/server";
import { coreApiFetch, CoreApiError } from "../_lib/core-api";

type SearchHit = {
  id?: unknown;
  payload?: { text?: unknown; title?: unknown } | null;
};

type SearchResponse = { hits?: SearchHit[] };

function wordsOf(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Fraction of the query's (unique) words that also appear in the title —
 * the "too close to the title" anti-junk gate (Spec 0031 §2 GAME-001). */
function titleOverlapFraction(query: string, title: string): number {
  const qWords = Array.from(new Set(wordsOf(query)));
  if (qWords.length === 0) return 0;
  const tWords = new Set(wordsOf(title));
  const shared = qWords.filter((w) => tWords.has(w)).length;
  return shared / qWords.length;
}

function hitTitle(hit: SearchHit): string {
  const payload = (hit.payload ?? {}) as Record<string, unknown>;
  return String(payload.title ?? "").trim() || "(untitled chunk)";
}

/**
 * POST an attempt (Spec 0031 §2 GAME-001): the player's "poison query" is
 * fired at the real /v1/search (k=5, live — never simulated), and scored
 * by where the anchor actually lands. A win (anchor falls out of top 5)
 * emits a consented exhaust triplet: the query as the positive, and
 * whatever out-ranked the anchor as the hard negative — Beat the
 * Baseline's harvest for the contrastive head (spec §3-4).
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const userRef = String(body.userRef ?? "").trim();
  const anchorId = String(body.anchorId ?? "").trim();
  const anchorTitle = String(body.anchorTitle ?? "").trim();
  const query = String(body.query ?? "").trim();

  if (!userRef || !anchorId || !anchorTitle || !query) {
    return NextResponse.json(
      { error: "userRef, anchorId, anchorTitle, query are required" },
      { status: 400 },
    );
  }

  if (query.length < 8) {
    return NextResponse.json(
      { error: "too short — give the baseline something real to fail on" },
      { status: 422 },
    );
  }
  if (!/[a-zA-Z]/.test(query)) {
    return NextResponse.json(
      { error: "no letters in that — the baseline can't be poisoned by digits alone" },
      { status: 422 },
    );
  }
  if (titleOverlapFraction(query, anchorTitle) > 0.6) {
    return NextResponse.json(
      { error: "too close to the title — paraphrase like you mean it" },
      { status: 422 },
    );
  }

  try {
    const data = (await coreApiFetch("/v1/search", {
      method: "POST",
      body: JSON.stringify({ query, k: 5 }),
    }, { useSearchKey: true })) as SearchResponse;

    const hits = Array.isArray(data.hits) ? data.hits : [];
    const anchorIndex = hits.findIndex((h) => String(h.id ?? "") === anchorId);
    const anchorRank = anchorIndex === -1 ? null : anchorIndex + 1;
    const topRawHit = hits.length > 0 ? hits[0] : null;
    const topHit = topRawHit
      ? { title: hitTitle(topRawHit), id: String(topRawHit.id ?? "") }
      : null;

    let result: "POISONED" | "wounded" | "resisted";
    let score: number;
    if (anchorRank === null) {
      result = "POISONED";
      score = 10;
    } else if (anchorRank >= 4) {
      result = "wounded";
      score = 3;
    } else {
      result = "resisted";
      score = 0;
    }

    if (result === "POISONED" && topHit && topHit.id) {
      // Fire-and-await, same as the Arena's pick emit: pacing tolerates the
      // round trip and a failed exhaust write should surface, not vanish.
      try {
        await coreApiFetch("/v1/exhaust", {
          method: "POST",
          body: JSON.stringify({
            source: "dumbmodel",
            kind: "interaction",
            consent: true,
            payload: {
              event: "beat-baseline",
              userRef,
              label: {
                kind: "triplet",
                anchor: `${anchorTitle} :: ${anchorId}`,
                positive: query,
                hardNegative: topHit.id,
              },
            },
          }),
        });
      } catch {
        // Don't fail the round over a harvest write — the player's honest
        // result still stands even if the exhaust intake hiccups.
      }
    }

    return NextResponse.json({ result, anchorRank, topHit, score });
  } catch (e) {
    const status = e instanceof CoreApiError ? e.status : 502;
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status });
  }
}
