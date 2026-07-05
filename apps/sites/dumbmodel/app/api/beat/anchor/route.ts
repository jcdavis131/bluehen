import { NextResponse } from "next/server";
import { coreApiFetch, CoreApiError } from "../_lib/core-api";
import { randomProbe } from "../_lib/probes";

type SearchHit = {
  id?: unknown;
  payload?: { text?: unknown; title?: unknown } | null;
};

type SearchResponse = { hits?: SearchHit[] };

/**
 * GET a random anchor (Spec 0031 §2 GAME-001): fires a random topic probe
 * at the real research index (k=8) and hands back one hit as the anchor
 * the player has to poison. Real retrieval, not a fixture — the same
 * /v1/search the baseline serves everywhere else. The probe itself is
 * never shown to the player; only the anchor's own title + snippet.
 */
export async function GET() {
  try {
    const data = (await coreApiFetch("/v1/search", {
      method: "POST",
      body: JSON.stringify({ query: randomProbe(), k: 8 }),
    }, { useSearchKey: true })) as SearchResponse;

    const hits = Array.isArray(data.hits) ? data.hits : [];
    if (hits.length === 0) {
      return NextResponse.json(
        { error: "no anchors available right now — the research index came back empty" },
        { status: 404 },
      );
    }

    const hit = hits[Math.floor(Math.random() * hits.length)];
    const anchorId = String(hit.id ?? "").trim();
    const payload = (hit.payload ?? {}) as Record<string, unknown>;
    const title = String(payload.title ?? "").trim() || "(untitled chunk)";
    const snippet = String(payload.text ?? "").trim();

    if (!anchorId || !snippet) {
      return NextResponse.json(
        { error: "anchor hit was missing an id or text — try again" },
        { status: 502 },
      );
    }

    return NextResponse.json({ anchorId, title, snippet });
  } catch (e) {
    const status = e instanceof CoreApiError ? e.status : 502;
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status });
  }
}
