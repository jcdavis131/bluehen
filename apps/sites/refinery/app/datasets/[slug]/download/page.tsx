import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";
import { getDataset } from "../../../../lib/catalog";
import { DownloadPanel } from "../../../../components/DownloadPanel";

export const dynamic = "force-dynamic";

export default async function DatasetDownloadPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ order_id?: string }>;
}) {
  const { slug } = await params;
  const { order_id: orderId } = await searchParams;
  const surface = getSiteCircuit("refinery");
  const ds = await getDataset(slug);
  if (!ds) notFound();

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Download full corpus"
        lead={`Paid access for ${ds.name}. Links expire after one hour.`}
      />

      {!orderId ? (
        <div className="bh-card bh-note">
          <div className="bh-card__title">Order reference required</div>
          <p className="bh-card__body">
            Complete checkout first, then return here with your order or cart id in the URL
            (<code>?order_id=...</code>).
          </p>
          <Link href={`/datasets/${encodeURIComponent(slug)}`} className="bh-btn bh-btn--primary" style={{ marginTop: 12 }}>
            ← Back to dataset
          </Link>
        </div>
      ) : (
        <DownloadPanel datasetSlug={ds.slug} datasetName={ds.name} orderId={orderId} />
      )}
    </>
  );
}
