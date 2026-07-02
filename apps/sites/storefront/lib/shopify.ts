/** Shopify Storefront API client (server-side only).
 *
 * Configuration (all server env — nothing NEXT_PUBLIC):
 *   SHOPIFY_STORE_DOMAIN            e.g. "bluehenre.myshopify.com"
 *   SHOPIFY_STOREFRONT_ACCESS_TOKEN Storefront API token (public-scope token,
 *                                   but kept server-side by policy)
 *   SHOPIFY_API_VERSION             optional, default "2025-01"
 *
 * Unconfigured stores degrade to an honest "not configured" state — no
 * fabricated products, per the evidence-backed brand rule.
 */

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

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

export function shopifyConfigured(): boolean {
  return Boolean(DOMAIN && TOKEN);
}

async function storefront<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  if (!DOMAIN || !TOKEN) throw new Error("Shopify Storefront API not configured");
  const res = await fetch(`https://${DOMAIN}/api/${VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Storefront API ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  if (!json.data) throw new Error("Storefront API returned no data");
  return json.data;
}

const PRODUCTS_QUERY = /* GraphQL */ `
  query Products($first: Int!) {
    products(first: $first, sortKey: BEST_SELLING) {
      edges {
        node {
          id
          handle
          title
          description
          featuredImage { url }
          variants(first: 1) {
            edges { node { id availableForSale price { amount currencyCode } } }
          }
        }
      }
    }
  }
`;

interface ProductsData {
  products: {
    edges: {
      node: {
        id: string;
        handle: string;
        title: string;
        description: string;
        featuredImage: { url: string } | null;
        variants: {
          edges: {
            node: {
              id: string;
              availableForSale: boolean;
              price: { amount: string; currencyCode: string };
            };
          }[];
        };
      };
    }[];
  };
}

export async function listProducts(first = 12): Promise<StoreProduct[]> {
  const data = await storefront<ProductsData>(PRODUCTS_QUERY, { first });
  return data.products.edges.map(({ node }) => {
    const variant = node.variants.edges[0]?.node ?? null;
    return {
      id: node.id,
      handle: node.handle,
      title: node.title,
      description: node.description,
      price: variant?.price.amount ?? "0",
      currency: variant?.price.currencyCode ?? "USD",
      imageUrl: node.featuredImage?.url ?? null,
      variantId: variant?.id ?? null,
      available: variant?.availableForSale ?? false,
    };
  });
}

const CART_CREATE_MUTATION = /* GraphQL */ `
  mutation CartCreate($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) {
      cart { checkoutUrl }
      userErrors { message }
    }
  }
`;

interface CartCreateData {
  cartCreate: {
    cart: { checkoutUrl: string } | null;
    userErrors: { message: string }[];
  };
}

/** Create a Shopify cart for one variant and return the hosted checkout URL. */
export async function createCheckout(variantId: string, quantity = 1): Promise<string> {
  const data = await storefront<CartCreateData>(CART_CREATE_MUTATION, {
    lines: [{ merchandiseId: variantId, quantity }],
  });
  const errors = data.cartCreate.userErrors;
  if (errors.length) throw new Error(errors.map((e) => e.message).join("; "));
  const url = data.cartCreate.cart?.checkoutUrl;
  if (!url) throw new Error("cartCreate returned no checkout URL");
  return url;
}
