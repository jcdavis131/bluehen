import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@synthaembed/ui-fleet/site-api";

export const dynamic = "force-dynamic";

/**
 * Worldbook terminal BFF (Spec 0033 V0): proxies the public deterministic
 * wiki (Spec 0020) so the library and HQ terminals render real pages,
 * never invented ones.
 *
 * GET /api/overworld/wiki          -> { pages: [...] }  (list)
 * GET /api/overworld/wiki?slug=x   -> full page          (single)
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  try {
    const data = await apiFetch(slug ? `/v1/wiki/${encodeURIComponent(slug)}` : "/v1/wiki");
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("SYNTH_API_KEY") ? 503 : 502;
    return NextResponse.json(slug ? { error: msg } : { pages: [], error: msg }, { status });
  }
}
