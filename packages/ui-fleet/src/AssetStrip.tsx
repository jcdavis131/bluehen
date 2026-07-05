/** Live asset strip (Spec FLY-002) — a slim, honest one-liner sourced from
 * the Data Refinery catalog. Public endpoint, no key. Renders nothing on
 * failure: no placeholder zeros, no skeleton — honest absence over a fake
 * number. Place near the footer of a page's main content, not the hero. */
export async function AssetStrip({
  siteAccent,
}: {
  /** Optional single accent class toggle — keep styling complexity minimal. */
  siteAccent?: boolean;
}) {
  const base = process.env.SYNTH_API_BASE_URL ?? "http://localhost:8000";

  let stats: { datasets: number; chunks: number } | null = null;
  try {
    const res = await fetch(`${base}/v1/catalog/stats`, {
      next: { revalidate: 300 },
    } as RequestInit);
    if (res.ok) {
      stats = (await res.json()) as { datasets: number; chunks: number };
    }
  } catch {
    stats = null;
  }

  if (!stats) return null;

  return (
    <p className={`bh-meta${siteAccent ? " bh-meta--accent" : ""}`}>
      The engine holds {stats.datasets} datasets · {stats.chunks} chunks · and
      it&apos;s training itself
    </p>
  );
}
