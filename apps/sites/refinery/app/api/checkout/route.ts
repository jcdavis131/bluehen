import { NextRequest, NextResponse } from "next/server";
import {
  commerceConfigured,
  createDatasetCheckout,
  datasetVariantId,
  isVariantId,
} from "../../../lib/commerce";

/** POST { datasetSlug, variantId? } → 303 redirect to Medusa checkout. */
export async function POST(req: NextRequest) {
  if (!commerceConfigured()) {
    return NextResponse.json({ error: "checkout not configured" }, { status: 503 });
  }
  let datasetSlug: string | null = null;
  let variantId: string | null = datasetVariantId();
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await req.json()) as { datasetSlug?: string; variantId?: string };
    datasetSlug = body.datasetSlug?.trim() ?? null;
    variantId = body.variantId?.trim() ?? variantId;
  } else {
    const form = await req.formData();
    datasetSlug = form.get("datasetSlug")?.toString().trim() ?? null;
    variantId = form.get("variantId")?.toString().trim() ?? variantId;
  }
  if (!datasetSlug) {
    return NextResponse.json({ error: "datasetSlug required" }, { status: 400 });
  }
  if (!variantId || !isVariantId(variantId)) {
    return NextResponse.json({ error: "variantId required (set REFINERY_DATASET_VARIANT_ID)" }, { status: 400 });
  }
  try {
    const url = await createDatasetCheckout(variantId, datasetSlug);
    return NextResponse.redirect(url, 303);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "checkout failed" },
      { status: 502 },
    );
  }
}
