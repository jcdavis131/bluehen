import { PageHeader } from "@synthaembed/ui-fleet";
import Link from "next/link";
import { commerceConfigured, listProducts, type StoreProduct } from "../../lib/commerce";

export const metadata = {
  title: "Store — Blue Hen RE",
  description: "Self-serve packages: evaluation credits, managed embeddings, and design-partner seats.",
};

export const dynamic = "force-dynamic";

export default async function StorePage() {
  let products: StoreProduct[] = [];
  let error: string | null = null;
  const configured = commerceConfigured();
  if (configured) {
    try {
      products = await listProducts();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Commerce"
        title="Store"
        lead="Self-serve packages, fulfilled through secure hosted checkout. For custom scopes, use the contact briefing instead."
      />

      {!configured && (
        <div className="bh-card">
          <div className="bh-card__title">Store opening soon</div>
          <p className="bh-card__body">
            Self-serve checkout is not yet enabled. Packages and engagement
            terms are listed on the <Link href="/pricing">pricing page</Link>,
            and the team responds to <Link href="/contact">contact briefings</Link>{" "}
            within two business days.
          </p>
        </div>
      )}

      {configured && error && (
        <div className="bh-card">
          <div className="bh-card__title">Store temporarily unavailable</div>
          <p className="bh-card__body">
            Product listings could not be loaded. Please retry shortly or{" "}
            <Link href="/contact">contact the team</Link>.
          </p>
        </div>
      )}

      {products.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {products.map((p) => (
            <div key={p.id} className="bh-card">
              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt={p.title}
                  style={{ width: "100%", borderRadius: 6, marginBottom: 10 }}
                />
              )}
              <div className="bh-card__title">{p.title}</div>
              <p className="bh-card__body">{p.description}</p>
              <p className="bh-card__body" style={{ fontWeight: 600 }}>
                {Number(p.price).toLocaleString(undefined, { style: "currency", currency: p.currency })}
              </p>
              {p.variantId && p.available ? (
                <form action="/api/checkout" method="POST">
                  <input type="hidden" name="variantId" value={p.variantId} />
                  <button type="submit" className="bh-btn">
                    Buy — secure hosted checkout
                  </button>
                </form>
              ) : (
                <p className="bh-card__body">Currently unavailable.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
