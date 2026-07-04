import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";
import { getDataset, getSample } from "../../../lib/catalog";
import { commerceConfigured, datasetVariantId } from "../../../lib/commerce";
import { BuyCorpusButton } from "../../../components/BuyCorpusButton";

export const revalidate = 60;

export default async function DatasetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const surface = getSiteCircuit("refinery");
  const ds = await getDataset(slug);
  if (!ds) notFound();
  const sample = ds.sampleAvailable ? await getSample(slug) : null;
  const checkoutReady = commerceConfigured();

  return (
    <>
      <PageHeader eyebrow={surface?.eyebrow} title={ds.name} lead={`${ds.docCount} docs · ${ds.chunkCount} chunks · created ${new Date(ds.createdAt).toUTCString()}`} />

      <section className="bh-card bh-card--organic" style={{ marginBottom: 20 }}>
        <h2 className="bh-card__title">Access tiers</h2>
        <p className="bh-card__body">
          <strong>Free preview</strong> — sample chunks below (sanitized, rate-limited).
          <br />
          <strong>Paid full corpus</strong> — complete <code>chunks.jsonl</code> via time-limited signed URL after checkout.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
          <BuyCorpusButton
            datasetSlug={ds.slug}
            variantId={datasetVariantId()}
            commerceReady={checkoutReady}
          />
          <Link href={`/requests?dataset=${encodeURIComponent(ds.slug)}`} className="bh-btn bh-btn--ghost">
            Custom harvest / scope
          </Link>
        </div>
      </section>

      <section className="bh-card" style={{ marginBottom: 20 }}>
        <h2 className="bh-card__title">Provenance</h2>
        <p className="bh-card__body">
          Source: <code>{ds.sourceId ?? "—"}</code>
          {ds.provenance?.extractor ? <> · extractor <code>{String(ds.provenance.extractor)}</code></> : null}
          {ds.provenance?.chunkStrategy ? <> · chunking <code>{String(ds.provenance.chunkStrategy)}</code></> : null}
        </p>
        {ds.tags.length > 0 && (
          <p className="bh-meta" style={{ marginTop: 8 }}>{ds.tags.join(" · ")}</p>
        )}
      </section>

      {ds.cardMd ? (
        <section className="bh-card bh-card--organic" style={{ marginBottom: 20 }}>
          <h2 className="bh-card__title">OKF dataset card</h2>
          <pre className="bh-pre-result" style={{ whiteSpace: "pre-wrap", overflowX: "auto", fontSize: "0.8125rem" }}>
            {ds.cardMd}
          </pre>
        </section>
      ) : (
        <div className="bh-alert" style={{ marginBottom: 20 }}>
          No OKF card recorded for this dataset. Cards are generated on
          harvest (<code>POST /v1/admin/datalab/harvest</code>).
        </div>
      )}

      {sample && sample.chunks.length > 0 && (
        <section className="bh-card" style={{ marginBottom: 20 }}>
          <h2 className="bh-card__title">Sample chunks (free preview — first {sample.chunks.length}, sanitized)</h2>
          <div className="bh-stack" style={{ marginTop: 10 }}>
            {sample.chunks.slice(0, 8).map((c, i) => (
              <div key={i} className="bh-hit">
                <p className="bh-card__body" style={{ margin: 0 }}>{c.text}</p>
                {c.docId && <p className="bh-meta" style={{ margin: "6px 0 0" }}>{c.docId}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/catalog" className="bh-btn bh-btn--ghost">← Catalog</Link>
      </div>
    </>
  );
}
