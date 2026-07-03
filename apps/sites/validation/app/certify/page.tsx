import { PageHeader, Reveal } from "@synthaembed/ui-fleet";import { getSiteCircuit } from "@synthaembed/fleet";import Link from "next/link";

export const metadata = {
  title: "RAG Certification — slasso.com",
  description:
    "A paid, reproducible benchmark run of your retrieval stack with a published scorecard.",
};

const STEPS = [
  {
    title: "1 · Scope",
    body: "You describe the stack (embedder, index, reranker) and pick the tier. We agree the eval set: yours under NDA, or our public suites.",
  },
  {
    title: "2 · Run",
    body: "We execute the benchmark on the shared harness (nDCG@10, effective rank, latency) with pinned versions and a reproduction script you keep.",
  },
  {
    title: "3 · Scorecard",
    body: "You get the full report. If the run clears the tier's thresholds, the certification is published on the reference leaderboard with a dated, linkable scorecard.",
  },
];

export default function CertifyPage() {
  const surface = getSiteCircuit("validation");

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Get your RAG certified"
        lead="A reproducible benchmark run of your retrieval stack, scored against published thresholds, with a scorecard you can link in sales conversations."
      />

      <div className="bh-grid" style={{ marginBottom: "var(--bh-space-6)" }}>
        {STEPS.map((s, i) => (
          <Reveal key={s.title} index={i}>
            <div className="bh-card">
              <div className="bh-card__title">{s.title}</div>
              <p className="bh-card__body">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="bh-card bh-card--organic" style={{ marginBottom: "var(--bh-space-6)" }}>
        <div className="bh-card__title">What certification means here</div>
        <p className="bh-card__body">
          Every published number is measured on the same harness that gates our
          own deploys (Spec 0008): nDCG@10 against relevance judgments and
          effective rank of the serving embeddings. Methodology and pinned
          versions ship with every scorecard. A certification you cannot
          reproduce is not one we publish.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a className="bh-btn bh-btn--primary bh-btn--hero" href="https://bhenre.com/store">
          Book a certification run
        </a>
        <a className="bh-btn bh-btn--ghost" href="https://bhenre.com/contact?topic=evaluation-sprint">
          Questions first? Start a briefing
        </a>
        <Link className="bh-btn bh-btn--ghost" href="/try">
          Preview the harness
        </Link>
      </div>
    </>
  );
}
