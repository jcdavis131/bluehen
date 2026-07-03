import Link from "next/link";
import {
  CountUpStat,
  CrossSellStrip,
  ExplorationTracker,
  PageHeader,
  Reveal,
  TeamStrip,
  type ExplorationSurface,
} from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";
import { getStats, listDatasets } from "../lib/catalog";
import { CatalogReturnGreeting } from "../components/CatalogReturnGreeting";

export const revalidate = 60;

// Exploration tracker scope: data.bhenre.com surfaces only (localStorage is
// per-origin — claiming cross-site visits would be dishonest). Interior
// pages record themselves via <SurfaceVisit /> so the pips reflect real
// visits.
const REFINERY_SURFACES: ExplorationSurface[] = [
  { id: "home", label: "The pipeline", href: "/" },
  { id: "catalog", label: "Dataset catalog", href: "/catalog" },
  { id: "contribute", label: "Contribute data", href: "/contribute" },
  { id: "requests", label: "Custom harvests", href: "/requests" },
];

export default async function Home() {
  const surface = getSiteCircuit("refinery");
  const [stats, latest] = await Promise.all([getStats(), listDatasets()]);

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Datasets with receipts"
        lead="The Data Operations division of Blue Hen RE, as a product: every dataset here carries its provenance — source, extractor, chunking strategy, and an OKF card — because training data you can't audit is training data you can't trust."
      />

      <TeamStrip siteId="refinery" />

      <CatalogReturnGreeting datasets={latest?.items ?? []} />

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
          Catalog unreachable — counts render when the production API responds
          (<code>GET /v1/catalog/stats</code>).
        </div>
      )}

      <Reveal index={1}>
        <section className="bh-card bh-card--organic" style={{ marginBottom: 24 }}>
          <h2 className="bh-card__title bh-card__title--lg">The pipeline</h2>
          <p className="bh-card__body">
            source → fetch (SSRF-guarded, robots-respecting) → structure →
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
        <div className="bh-stack" style={{ gap: 16, marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Link href="/catalog" className="bh-btn bh-btn--primary bh-btn--hero">
              Browse the catalog
            </Link>
            <Link href="/contribute" className="bh-btn bh-btn--ghost">
              Contribute data
            </Link>
            <Link href="/requests" className="bh-btn bh-btn--ghost">
              Request a custom harvest
            </Link>
            <span className="bh-live" style={{ marginLeft: "auto" }}>
              <span className="bh-kbd">⌘K</span> jump anywhere
            </span>
          </div>
          <ExplorationTracker surfaces={REFINERY_SURFACES} currentId="home" />
        </div>
      </Reveal>

      <CrossSellStrip siteId="refinery" />
    </>
  );
}
