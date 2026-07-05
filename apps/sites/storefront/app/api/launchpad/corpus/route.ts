import { NextRequest, NextResponse } from "next/server";
import {
  errorJson,
  launchpadFetch,
  randomSessionId,
  RUN_COOKIE,
  RUN_COOKIE_MAX_AGE_S,
  SESSION_COOKIE,
  SESSION_COOKIE_MAX_AGE_S,
  upstreamDetail,
} from "../_shared";

/** Spec 0027 step 2 (Upload): sandbox caps enforced again server-side
 * (client caps are UX, not security), corpus name namespaced per session,
 * one concurrent run per session via the lp_run cookie. */

const MAX_DOCS = 50;
const MAX_TOTAL_BYTES = 200_000;

type Doc = { text?: unknown; title?: unknown; id?: unknown; metadata?: unknown };

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorJson(400, "JSON body required");
    }

    const name = (body as { name?: unknown } | null)?.name;
    const documents = (body as { documents?: unknown } | null)?.documents;

    if (typeof name !== "string" || !name.trim()) {
      return errorJson(400, "a dataset name is required");
    }
    if (!Array.isArray(documents) || documents.length === 0) {
      return errorJson(400, "at least one document is required");
    }
    if (documents.length > MAX_DOCS) {
      return errorJson(400, `at most ${MAX_DOCS} documents in the sandbox`);
    }
    let totalBytes = 0;
    for (const d of documents as Doc[]) {
      if (typeof d?.text !== "string" || !d.text.trim()) {
        return errorJson(400, "every document needs non-empty text");
      }
      totalBytes += Buffer.byteLength(d.text, "utf-8");
    }
    if (totalBytes > MAX_TOTAL_BYTES) {
      return errorJson(400, `sandbox corpus exceeds ${MAX_TOTAL_BYTES.toLocaleString()} bytes total`);
    }

    const existingRun = req.cookies.get(RUN_COOKIE)?.value;
    if (existingRun) {
      return errorJson(
        429,
        "A sandbox run is already in progress for this session — wait for it to finish (up to 15 minutes) before starting another.",
      );
    }

    const sid = req.cookies.get(SESSION_COOKIE)?.value || randomSessionId();
    const prefixedName = `lp-${sid}-${name.trim()}`.slice(0, 120);

    const { ok, status, body: respBody } = await launchpadFetch("/v1/corpus", {
      method: "POST",
      body: JSON.stringify({ name: prefixedName, documents, train: true }),
    });

    if (!ok) {
      return errorJson(status, upstreamDetail(respBody, "the sandbox could not start this run"));
    }

    const jobId = (respBody as { training?: { jobId?: unknown } } | null)?.training?.jobId;
    const res = NextResponse.json(respBody, { status });
    res.cookies.set(SESSION_COOKIE, sid, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE_S,
    });
    if (typeof jobId === "string" && jobId) {
      res.cookies.set(RUN_COOKIE, jobId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: RUN_COOKIE_MAX_AGE_S,
      });
    }
    return res;
  } catch (e) {
    return errorJson(500, e instanceof Error ? e.message : "unexpected error");
  }
}
