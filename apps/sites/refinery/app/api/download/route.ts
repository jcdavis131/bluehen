import { NextRequest, NextResponse } from "next/server";
import { adminConfigured, fulfillDatasetOrder, issueDatasetDownload } from "../../../lib/fulfill";

/** BFF: grant entitlement (admin) then issue time-limited download URL. */
export async function POST(req: NextRequest) {
  if (!adminConfigured()) {
    return NextResponse.json({ error: "fulfillment not configured" }, { status: 503 });
  }
  let body: { orderId?: string; datasetSlug?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const orderId = body.orderId?.trim();
  const datasetSlug = body.datasetSlug?.trim();
  if (!orderId || !datasetSlug) {
    return NextResponse.json({ error: "orderId and datasetSlug required" }, { status: 400 });
  }
  try {
    await fulfillDatasetOrder(orderId, datasetSlug, body.email ?? "");
    const out = await issueDatasetDownload(datasetSlug, orderId);
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "download failed" },
      { status: 502 },
    );
  }
}
