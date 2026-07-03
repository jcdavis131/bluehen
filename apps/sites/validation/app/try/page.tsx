import Link from "next/link";
import { LiveSearchPanel, PageHeader } from "@synthaembed/ui-fleet";import { BENCHMARK_EXAMS } from "@synthaembed/eval-public";
import { getSiteCircuit, GLOSSARY } from "@synthaembed/fleet";
export const metadata = {
  title: `Run Benchmark — Validation Lab`,
  description: "Live benchmark on slasso.com",
};

export default function TryPage() {
  const surface = getSiteCircuit("validation");

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Run Benchmark"
        lead={
          <>
            Evaluate the production model on a certified slice. Compare baselines on{" "}
            <Link href="https://dumbmodel.com/compare">Baseline Comparison</Link>.
          </>
        }
        badge={<span className="bh-badge bh-badge--ok">Validation & Charter</span>}
      />

      <div className="bh-card" style={{ marginBottom: "var(--bh-space-5)" }}>
        <strong className="bh-card__title">Benchmark catalog (static)</strong>
        <p className="bh-card__body" style={{ marginTop: "var(--bh-space-2)" }}>
          Select a theme below or write your own. YAML exam runner ships in Phase B.
        </p>
        <ul className="bh-card__body" style={{ margin: "var(--bh-space-2) 0 0", paddingLeft: 18 }}>
          {BENCHMARK_EXAMS.slice(0, 4).map((e) => (
            <li key={e.id}>
              {e.title} · tier {e.tier}
            </li>
          ))}
        </ul>
      </div>

      <LiveSearchPanel
        siteId="validation"
        title={`${GLOSSARY.qualifying} — live search`}
        description="Production retrieval path. Feedback is recorded for Validation → R&D review."
        defaultQuery="Multi-hop retrieval: connect methods paper to deployment constraints"
        sampleQueries={[
          "Domain shift: zero-shot vs fine-tuned embedding quality",
          "Edge serving latency with Matryoshka truncation",
          "Hallucination-resistant RAG grounding",
        ]}
      />
    </>
  );
}
