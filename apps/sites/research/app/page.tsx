import Link from "next/link";
import { ArxivExamDemo } from "../components/ArxivExamDemo";
import { PageHeader } from "@synthaembed/ui-fleet";import { getSiteCircuit, GLOSSARY, RE } from "@synthaembed/fleet";
export const metadata = {
  title: "Applied Research — arxiviq.com",
  description: "Live search + Research Registry · arxiviq.com",
};

export default function ResearchRagPage() {
  const surface = getSiteCircuit("research");

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Search arXiv like it's your own corpus"
        lead={
          <>
            A research retrieval assistant, live below — the same production stack we run for
            customers, pointed at arXiv. {RE.tech} in production ·{" "}
            <Link href="/research-lab">browse the {GLOSSARY.experimentMuseum.toLowerCase()} →</Link>
          </>
        }
        badge={<span className="bh-badge bh-badge--ok">R&D + Data Operations</span>}
      />
      <ArxivExamDemo />

      <div className="bh-card bh-card--organic" style={{ marginTop: "var(--bh-space-6)" }}>
        <div className="bh-card__title">Use this on your own papers</div>
        <p className="bh-card__body">
          Design-partner seats get a dedicated workspace: your corpus, monthly
          retraining behind deploy gates, and direct roadmap input. First cohort,
          quarterly terms.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="bh-btn bh-btn--primary bh-btn--hero" href="https://bhenre.com/store">
            Reserve a design-partner seat
          </a>
          <a className="bh-btn bh-btn--ghost" href="https://bhenre.com/contact?topic=managed-embeddings">
            Ask about a custom corpus
          </a>
        </div>
      </div>
    </>
  );
}
