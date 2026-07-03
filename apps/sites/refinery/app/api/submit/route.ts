import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@synthaembed/ui-fleet/site-api";

/** BFF: consented contribution → core-api /v1/datalab/submit.
 * The workspace key stays server-side; consent is enforced upstream too. */
export async function POST(req: NextRequest) {
  let body: { texts?: string[]; consent?: boolean; tags?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.consent) {
    return NextResponse.json(
      { error: "consent is required to store contributions" },
      { status: 400 },
    );
  }
  try {
    const out = await apiFetch("/v1/datalab/submit", {
      method: "POST",
      body: JSON.stringify({
        texts: (body.texts ?? []).slice(0, 64),
        consent: true,
        tags: (body.tags ?? []).slice(0, 8),
      }),
    });
    return NextResponse.json(out, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "submission failed" },
      { status: 502 },
    );
  }
}
