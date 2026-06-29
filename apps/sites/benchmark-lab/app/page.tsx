import Link from "next/link";
import { BENCHMARK_EXAMS, RAG_TIERS, hallOfCone } from "@synthaembed/eval-public";
import { PageHeader, SiteSubnav } from "@synthaembed/ui-fleet";
import { getSiteCircuit, getSiteNav, GLOSSARY, RE } from "@synthaembed/fleet";

export const metadata = {
  title: "Validation Lab — slasso.com",
  description: "Certified RAG benchmarks · Silver Lasso lineage",
};

export default function BenchmarkHome() {
  const leaderboard = hallOfCone().slice(0, 5);
  const surface = getSiteCircuit("benchmark-lab");
  const nav = getSiteNav("benchmark-lab");

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Validation Lab"
        lead={
          <>
            Certified benchmarks across basic → advanced RAG tiers. Evidence-backed scorecards.{" "}
            <Link href="/try">Run a benchmark →</Link>
          </>
        }
        badge={<span className="bh-badge bh-badge--accent">Validation · {RE.tech}</span>}
      />
      <SiteSubnav items={nav} currentPath="/" />

      <h2 className="bh-section-title">Evaluation tiers</h2>
      <div className="bh-grid" style={{ marginBottom: "var(--bh-space-8)" }}>
        {RAG_TIERS.map((t) => (
          <div key={t.id} className="bh-card">
            <div className="bh-card__title">{t.label}</div>
            <p className="bh-card__body" style={{ marginTop: "var(--bh-space-2)" }}>
              {t.desc}
            </p>
          </div>
        ))}
      </div>

      <h2 className="bh-section-title">Benchmark suite</h2>
      <div className="bh-table-wrap" style={{ marginBottom: "var(--bh-space-8)" }}>
        <table className="bh-table">
          <thead>
            <tr>
              <th>Exam</th>
              <th>Tier</th>
              <th>nDCG@10</th>
            </tr>
          </thead>
          <tbody>
            {BENCHMARK_EXAMS.map((e) => (
              <tr key={e.id}>
                <td>{e.title}</td>
                <td>{e.tier}</td>
                <td className="bh-mono">{e.lastRunNdcg?.toFixed(2) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="bh-section-title">Reference leaderboard</h2>
      <div className="bh-grid" style={{ marginBottom: "var(--bh-space-6)" }}>
        {leaderboard.map((m, i) => (
          <div key={m.id} className="bh-card">
            <div className="bh-card__title">
              {i === 0 ? "Top · " : ""}
              {m.name}
            </div>
            <div className="bh-meta" style={{ marginTop: "var(--bh-space-1)" }}>
              erank {m.effectiveRank.toFixed(1)} · nDCG {m.ndcg10.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <Link href="https://dumbmodel.com">Baseline comparison on dumbmodel.com →</Link>
    </>
  );
}
