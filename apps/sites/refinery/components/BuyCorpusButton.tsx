"use client";

/** Checkout form for full-corpus dataset purchase (shown only when commerce is configured). */
export function BuyCorpusButton({
  datasetSlug,
  variantId,
  commerceReady,
}: {
  datasetSlug: string;
  variantId: string | null;
  commerceReady: boolean;
}) {
  if (!commerceReady || !variantId) return null;

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
