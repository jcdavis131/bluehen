import Link from "next/link";
import { PageHeader } from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";
import { listReports } from "../../lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Strategy reports — Simulation Lab",
  description:
    "Published paper-trading strategy reports: corpus provenance, trade counts, platform rules applied, and measured simulation metrics. Simulation only.",
};

const STATUS_BADGE: Record<string, string> = {
  "fixture-pass": "bh-badge--warn",
  "corpus-run": "bh-badge--ok",
};

export default function ReportsPage() {
  const surface = getSiteCircuit("simulation");
  const reports = listReports();

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Strategy reports"
        lead="Every report carries its corpus provenance, trade counts, and the platform rule ids applied. Numbers without those don't publish here."
        badge={<span className="bh-badge bh-badge--warn">simulation only</span>}
      />

      {reports.length === 0 ? (
        <div className="bh-card">
          <div className="bh-card__body">
            No reports published yet. Reports render from{" "}
            <code>content/simulation/reports/</code>.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "var(--bh-space-3)" }}>
          {reports.map((r) => (
            <div key={r.slug} className="bh-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: "var(--bh-space-2)",
                  flexWrap: "wrap",
                }}
              >
                <div className="bh-card__title">
                  <Link href={`/reports/${r.slug}`} className="bh-link">
                    {r.title}
                  </Link>
                </div>
                {r.status && (
                  <span className={`bh-badge ${STATUS_BADGE[r.status] ?? "bh-badge--accent"}`}>
                    {r.status}
                  </span>
                )}
              </div>
              <div className="bh-card__body" style={{ color: "var(--bh-muted)" }}>
                {r.date}
                {r.strategy && <> · strategy: {r.strategy}</>}
                {r.platforms && <> · platforms: {r.platforms}</>}
              </div>
              {r.summary && <p className="bh-card__body">{r.summary}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
