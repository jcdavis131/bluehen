import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";
import { readReport } from "../../../lib/data";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const doc = readReport(slug);
  if (!doc) return { title: "Report — Simulation Lab" };
  return {
    title: `${doc.meta.title} — Simulation Lab`,
    description: doc.meta.summary ?? "Published paper-trading strategy report. Simulation only.",
  };
}

export default async function ReportDetailPage({ params }: Params) {
  const { slug } = await params;
  const surface = getSiteCircuit("simulation");
  const doc = readReport(slug);
  if (!doc) notFound();

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title={doc.meta.title}
        lead={[
          doc.meta.date && `published ${doc.meta.date}`,
          doc.meta.strategy && `strategy: ${doc.meta.strategy}`,
        ]
          .filter(Boolean)
          .join(" · ")}
        badge={
          <span className="bh-badge bh-badge--warn">{doc.meta.status ?? "simulation only"}</span>
        }
      />

      <div className="bh-card bh-card--flush">
        <div className="bh-card__body" style={{ padding: "var(--bh-space-4)" }}>
          <pre
            className="bh-mono"
            style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}
          >
            {doc.body}
          </pre>
        </div>
      </div>

      <div style={{ marginTop: "var(--bh-space-5)" }}>
        <Link href="/reports" className="bh-card__subtitle">
          ← Back to reports
        </Link>
      </div>
    </>
  );
}
