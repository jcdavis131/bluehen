"use client";

/** Checkout form for full-corpus dataset purchase. */
export function BuyCorpusButton({
  datasetSlug,
  variantId,
  commerceReady,
}: {
  datasetSlug: string;
  variantId: string | null;
  commerceReady: boolean;
}) {
  if (!commerceReady || !variantId) {
    return (
      <p className="bh-meta" style={{ margin: 0 }}>
        Self-serve checkout wiring in progress — use{" "}
        <a href={`/requests?dataset=${encodeURIComponent(datasetSlug)}`}>request full access</a> for now.
      </p>
    );
  }

  return (
    <form action="/api/checkout" method="POST" style={{ display: "inline" }}>
      <input type="hidden" name="datasetSlug" value={datasetSlug} />
      <input type="hidden" name="variantId" value={variantId} />
      <button type="submit" className="bh-btn bh-btn--primary">
        Buy full corpus
      </button>
    </form>
  );
}
