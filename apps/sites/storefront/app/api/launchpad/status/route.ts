import { NextRequest, NextResponse } from "next/server";
import { errorJson, launchpadFetch, upstreamDetail } from "../_shared";

/** Spec 0027 step 3 (Watch the loop): thin proxy to GET /v1/train/{jobId},
 * polled by the client every 5s. Whatever core-api returns is whatever the
 * wizard renders — no invented stages, no fake percentages. */
export async function GET(req: NextRequest) {
  try {
    const jobId = req.nextUrl.searchParams.get("jobId");
    if (!jobId) {
      return errorJson(400, "jobId query param is required");
    }
    const { ok, status, body } = await launchpadFetch(`/v1/train/${encodeURIComponent(jobId)}`);
    if (!ok) {
      return errorJson(status, upstreamDetail(body, "could not fetch run status"));
    }
    return NextResponse.json(body, { status });
  } catch (e) {
    return errorJson(500, e instanceof Error ? e.message : "unexpected error");
  }
}
