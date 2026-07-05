import { PageHeader, Reveal } from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";
import Link from "next/link";
import { CertifyForm } from "../../components/CertifyForm";

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

      <CertifyForm />

      <section className="bh-card" style={{ marginBottom: "var(--bh-space-6)" }}>
        <div className="bh-card__title">Integrate directly</div>
        <p className="bh-card__body" style={{ marginTop: "var(--bh-space-2)" }}>
          Call the certification API from your CI or staging environment. Submit an HTTPS endpoint; the worker
          embeds a fixed public catalog slice through your service and grades it with the same metric code that
          gates our own deploys. Typical turnaround: minutes.
        </p>
        <pre className="bh-pre-result" style={{ marginTop: 12, fontSize: "0.8125rem" }}>
{`POST /v1/certify
Authorization: Bearer <workspace-api-key>
{"endpointUrl": "https://your-service.com/embed"}

# Your endpoint contract (required):
POST {"texts": ["...", "..."]}
→ {"vectors": [[...], [...]]}`}
        </pre>
        <p className="bh-meta" style={{ marginTop: 12 }}>
          Poll <code className="bh-mono">GET /v1/certify/{"{submissionId}"}</code> for status and scorecard.
          Payment checkout attaches at the Operator gate; the measured scorecard is independent of billing state.
        </p>
      </section>

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
        <a className="bh-btn bh-btn--ghost" href="https://bhenre.com/contact?topic=evaluation-sprint">
          Need a guided sprint instead?
        </a>
        <Link className="bh-btn bh-btn--ghost" href="/try">
          Preview the harness
        </Link>
        <Link className="bh-btn bh-btn--ghost" href="/scorecards">
          Published scorecards
        </Link>
      </div>
    </>
  );
}
