import { NextRequest, NextResponse } from "next/server";
import { errorJson, launchpadFetch, upstreamDetail } from "../_shared";

/** Spec 0027 step 4 (Try it): proxies /v1/recommend with the contract-driven
 * filters the client built from the step-1 field list. */
export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorJson(400, "JSON body required");
    }

    const text = (body as { text?: unknown } | null)?.text;
    if (typeof text !== "string" || !text.trim()) {
      return errorJson(400, "a query is required");
    }
    const filtersRaw = (body as { filters?: unknown } | null)?.filters;
    const filters =
      filtersRaw && typeof filtersRaw === "object" && !Array.isArray(filtersRaw)
        ? (filtersRaw as Record<string, unknown>)
        : undefined;

    const { ok, status, body: respBody } = await launchpadFetch("/v1/recommend", {
      method: "POST",
      body: JSON.stringify({ text, k: 8, ...(filters && Object.keys(filters).length ? { filters } : {}) }),
    });

    if (!ok) {
      return errorJson(status, upstreamDetail(respBody, "recommend failed"));
    }
    return NextResponse.json(respBody, { status });
  } catch (e) {
    return errorJson(500, e instanceof Error ? e.message : "unexpected error");
  }
}
