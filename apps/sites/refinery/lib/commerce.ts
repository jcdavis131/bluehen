/** Medusa checkout for dataset purchases (Spec 0021 P3). */

const MEDUSA_URL = process.env.MEDUSA_BACKEND_URL?.replace(/\/$/, "");
const MEDUSA_KEY = process.env.MEDUSA_PUBLISHABLE_KEY;
const MEDUSA_REGION = process.env.MEDUSA_REGION_ID;

export function commerceConfigured(): boolean {
  return Boolean(MEDUSA_URL && MEDUSA_KEY && MEDUSA_REGION);
}

export function datasetVariantId(): string | null {
  return process.env.REFINERY_DATASET_VARIANT_ID ?? null;
}

export function isVariantId(id: string): boolean {
  return /^variant_[A-Za-z0-9]+$/.test(id);
}

async function medusa<T>(
  path: string,
  init: { method?: string; body?: Record<string, unknown> } = {},
): Promise<T> {
  if (!MEDUSA_URL || !MEDUSA_KEY) throw new Error("Medusa Store API not configured");
  const res = await fetch(`${MEDUSA_URL}/store${path}`, {
    method: init.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": MEDUSA_KEY,
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Medusa API ${res.status}: ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

interface MedusaCartResponse {
  cart: { id: string };
}

/** Create a cart and return hosted checkout URL. Metadata carries dataset_slug for fulfillment. */
export async function createDatasetCheckout(
  variantId: string,
  datasetSlug: string,
  quantity = 1,
): Promise<string> {
  const { cart } = await medusa<MedusaCartResponse>("/carts", {
    method: "POST",
    body: {
      region_id: MEDUSA_REGION,
      items: [{ variant_id: variantId, quantity }],
      metadata: { source: "refinery", dataset_slug: datasetSlug },
    },
  });
  const storefront = process.env.MEDUSA_STOREFRONT_URL?.replace(/\/$/, "");
  const returnBase = process.env.REFINERY_PUBLIC_URL?.replace(/\/$/, "") ?? "";
  const returnUrl = returnBase
    ? `${returnBase}/datasets/${encodeURIComponent(datasetSlug)}/download?order_id={cart_id}`
    : undefined;
  const checkoutBase = storefront ?? MEDUSA_URL;
  const params = new URLSearchParams({ cart_id: cart.id });
  if (returnUrl) params.set("return_url", returnUrl);
  return `${checkoutBase}/checkout?${params}`;
}
