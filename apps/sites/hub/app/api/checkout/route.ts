import { NextRequest, NextResponse } from "next/server";
import { commerceConfigured, createCheckout, isVariantId } from "../../../lib/commerce";

/** POST { variantId } (form or JSON) → 303 redirect to the commerce
 * provider's hosted checkout (Medusa storefront checkout or Shopify). */
export async function POST(req: NextRequest) {
  if (!commerceConfigured()) {
    return NextResponse.json({ error: "store not configured" }, { status: 503 });
  }
  let variantId: string | null = null;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    variantId = ((await req.json()) as { variantId?: string }).variantId ?? null;
  } else {
    variantId = (await req.formData()).get("variantId")?.toString() ?? null;
  }
  if (!variantId || !isVariantId(variantId)) {
    return NextResponse.json({ error: "variantId required" }, { status: 400 });
  }
  try {
    const url = await createCheckout(variantId);
    return NextResponse.redirect(url, 303);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "checkout failed" },
      { status: 502 },
    );
  }
}
