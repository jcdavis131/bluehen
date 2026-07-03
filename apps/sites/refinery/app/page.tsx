import Link from "next/link";
import { CountUpStat, PageHeader, Reveal, TeamStrip } from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";
import { getStats, listDatasets } from "../lib/catalog";

export const revalidate = 60;

export default async function Home() {
  const surface = getSiteCircuit("refinery");
  const [stats, latest] = await Promise.all([getStats(), listDatasets()]);

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Datasets with receipts"
        lead="The Data Operations division of Blue Hen RE, as a product. Every dataset here carries its provenance (source, extractor, chunking strategy, and an OKF card), because training data you can't audit is training data you can't trust."
      />

      <TeamStrip siteId="refinery" />

      {stats ? (
        <Reveal index={0}>
          <div className="bh-grid bh-grid--2" style={{ marginBottom: 24 }}>
            <div className="bh-card">
              <p className="bh-card__title">Datasets in the catalog</p>
              <CountUpStat value={stats.datasets} digits={0} />
            </div>
            <div className="bh-card">
              <p className="bh-card__title">Source documents</p>
              <CountUpStat value={stats.docs} digits={0} />
            </div>
            <div className="bh-card">
              <p className="bh-card__title">Retrieval-ready chunks</p>
              <CountUpStat value={stats.chunks} digits={0} />
            </div>
            <div className="bh-card">
              <p className="bh-card__title">Last refinery sync</p>
              <p className="bh-card__body">
                {stats.lastSyncAt ? new Date(stats.lastSyncAt).toUTCString() : "—"}
              </p>
            </div>
          </div>
        </Reveal>
      ) : (
        <div className="bh-alert">
          Catalog unreachable. Counts render when the production API responds
          (<code>GET /v1/catalog/stats</code>).
        </div>
      )}

      <Reveal index={1}>
        <section className="bh-card bh-card--organic" style={{ marginBottom: 24 }}>
          <h2 className="bh-card__title bh-card__title--lg">The pipeline</h2>
          <p className="bh-card__body">
            source → fetch (SSRF-guarded) → structure →
            chunk → OKF dataset card → catalog. Unchanged content is skipped by
            hash; every collection is logged; consented contributions enter the
            same pipeline with a provenance receipt.
          </p>
        </section>
      </Reveal>

      {latest && latest.items.length > 0 && (
        <Reveal index={2}>
          <h2 className="bh-card__title bh-card__title--lg" style={{ marginBottom: 12 }}>
            Latest datasets
          </h2>
          <div className="bh-stack" style={{ marginBottom: 24 }}>
            {latest.items.slice(0, 4).map((d) => (
              <Link key={d.id} href={`/datasets/${d.slug}`} className="bh-card" style={{ display: "block" }}>
                <p className="bh-card__title">{d.name}</p>
                <p className="bh-meta">
                  {d.docCount} docs · {d.chunkCount} chunks
                  {d.tags.length > 0 && <> · {d.tags.join(" · ")}</>}
                </p>
              </Link>
            ))}
          </div>
        </Reveal>
      )}

      <Reveal index={3}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/catalog" className="bh-btn bh-btn--primary bh-btn--hero">
            Browse the catalog
          </Link>
          <Link href="/contribute" className="bh-btn bh-btn--ghost">
            Contribute data
          </Link>
          <Link href="/requests" className="bh-btn bh-btn--ghost">
            Request a custom harvest
          </Link>
        </div>
      </Reveal>
    </>
  );
}
