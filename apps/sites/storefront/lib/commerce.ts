/** Provider-agnostic commerce layer (server-side only).
 *
 * Default provider is Medusa — open source (MIT), self-hosted headless
 * commerce. Shopify remains available as a config option. Both providers
 * share the security property that matters: payment is completed by a
 * PCI-compliant gateway (Stripe/PayPal via Medusa, Shopify Payments via
 * Shopify); card data never touches this app's servers.
 *
 * Configuration:
 *   COMMERCE_PROVIDER=medusa|shopify        default "medusa"
 *
 *   Medusa (https://docs.medusajs.com — self-host alongside core-api):
 *     MEDUSA_BACKEND_URL          e.g. "https://store.bhenre.com" or http://localhost:9000
 *     MEDUSA_PUBLISHABLE_KEY      Store API publishable key (pk_...)
 *     MEDUSA_REGION_ID            region for pricing/currency (reg_...)
 *     MEDUSA_STOREFRONT_URL       optional hosted-storefront checkout base;
 *                                 when unset, carts hand off to
 *                                 `${MEDUSA_BACKEND_URL}/checkout?cart_id=...`
 *
 *   Shopify: see ./shopify.ts (SHOPIFY_STORE_DOMAIN + token).
 *
 * Unconfigured providers degrade to an honest "not configured" state — no
 * fabricated products, per the evidence-backed brand rule.
 */

import {
  createCheckout as shopifyCreateCheckout,
  listProducts as shopifyListProducts,
  shopifyConfigured,
} from "./shopify";

export interface StoreProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  imageUrl: string | null;
  variantId: string | null;
  available: boolean;
}

export type CommerceProvider = "medusa" | "shopify";

export function activeProvider(): CommerceProvider {
  return process.env.COMMERCE_PROVIDER === "shopify" ? "shopify" : "medusa";
}

export function commerceConfigured(): boolean {
  return activeProvider() === "shopify" ? shopifyConfigured() : medusaConfigured();
}

export async function listProducts(first = 12): Promise<StoreProduct[]> {
  return activeProvider() === "shopify"
    ? shopifyListProducts(first)
    : medusaListProducts(first);
}

/** Create a cart for one variant and return the URL where the customer
 * completes payment on the provider's checkout. */
export async function createCheckout(variantId: string, quantity = 1): Promise<string> {
  return activeProvider() === "shopify"
    ? shopifyCreateCheckout(variantId, quantity)
    : medusaCreateCheckout(variantId, quantity);
}

/** True when the id is a plausible variant id for the active provider —
 * request-shape validation for the checkout route. */
export function isVariantId(id: string): boolean {
  return activeProvider() === "shopify"
    ? id.startsWith("gid://shopify/")
    : /^variant_[A-Za-z0-9]+$/.test(id);
}

// ---------------------------------------------------------------------------
// Medusa Store API adapter (v2 REST)
// ---------------------------------------------------------------------------

const MEDUSA_URL = process.env.MEDUSA_BACKEND_URL?.replace(/\/$/, "");
const MEDUSA_KEY = process.env.MEDUSA_PUBLISHABLE_KEY;
const MEDUSA_REGION = process.env.MEDUSA_REGION_ID;

export function medusaConfigured(): boolean {
  return Boolean(MEDUSA_URL && MEDUSA_KEY && MEDUSA_REGION);
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

interface MedusaProductsResponse {
  products: {
    id: string;
    handle: string;
    title: string;
    description: string | null;
    thumbnail: string | null;
    variants:
      | {
          id: string;
          calculated_price?: {
            calculated_amount: number | null;
            currency_code: string | null;
          } | null;
          inventory_quantity?: number | null;
          manage_inventory?: boolean | null;
        }[]
      | null;
  }[];
}

async function medusaListProducts(first: number): Promise<StoreProduct[]> {
  const data = await medusa<MedusaProductsResponse>(
    `/products?limit=${first}&region_id=${encodeURIComponent(MEDUSA_REGION ?? "")}&fields=*variants.calculated_price`,
  );
  return data.products.map((p) => {
    const variant = p.variants?.[0] ?? null;
    const price = variant?.calculated_price ?? null;
    const inStock =
      variant != null &&
      (variant.manage_inventory === false || (variant.inventory_quantity ?? 0) > 0);
    return {
      id: p.id,
      handle: p.handle,
      title: p.title,
      description: p.description ?? "",
      price: price?.calculated_amount != null ? String(price.calculated_amount) : "0",
      currency: (price?.currency_code ?? "usd").toUpperCase(),
      imageUrl: p.thumbnail,
      variantId: variant?.id ?? null,
      available: inStock,
    };
  });
}

interface MedusaCartResponse {
  cart: { id: string };
}

async function medusaCreateCheckout(variantId: string, quantity: number): Promise<string> {
  const { cart } = await medusa<MedusaCartResponse>("/carts", {
    method: "POST",
    body: {
      region_id: MEDUSA_REGION,
      items: [{ variant_id: variantId, quantity }],
    },
  });
  const storefront = process.env.MEDUSA_STOREFRONT_URL?.replace(/\/$/, "");
  return storefront
    ? `${storefront}/checkout?cart_id=${encodeURIComponent(cart.id)}`
    : `${MEDUSA_URL}/checkout?cart_id=${encodeURIComponent(cart.id)}`;
}
