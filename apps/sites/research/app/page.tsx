import Link from "next/link";
import { ArxivExamDemo } from "../components/ArxivExamDemo";
import {
  Axis,
  CrossSellStrip,
  Marginalia,
  RuledSection,
  StatusLine,
  TitleCard,
  TeamStrip,
} from "@synthaembed/ui-fleet";
import { getSiteCircuit, GLOSSARY, RE } from "@synthaembed/fleet";

export const metadata = {
  title: "Applied Research — arxiviq.com",
  description: "Live search + Research Registry · arxiviq.com",
};

export default function ResearchRagPage() {
  const surface = getSiteCircuit("research");

  return (
    <>
      <StatusLine
        site="arxiviq.com"
        section="Applied Research"
        status="Live arXiv RAG"
      />

      <Axis>
        <TitleCard
          eyebrow={surface?.eyebrow}
          title="Search arXiv like it's your own corpus"
          marginalia={`${RE.tech} in production · live search`}
        >
          <p className="bh-title-card__copy">
            A research retrieval assistant, live below — the same production stack we run for
            customers, pointed at arXiv. {RE.tech} in production ·{" "}
            <Link href="/methods">how the method works and what we measured →</Link> ·{" "}
            <Link href="/research-lab">
              browse the {GLOSSARY.experimentMuseum.toLowerCase()} →
            </Link>
          </p>
        </TitleCard>

      <TeamStrip siteId="research" />

        <RuledSection label="Live arXiv search">
          <ArxivExamDemo />
        </RuledSection>

        <RuledSection label="Use this on your own papers">
          <div className="bh-card bh-card--organic">
            <div className="bh-card__title">Design-partner seat — what&apos;s included</div>
            <p className="bh-card__body">
              A design-partner seat is a dedicated workspace on the same production stack running
              above, pointed at your corpus instead of arXiv. First cohort, quarterly terms. Each
              seat includes:
            </p>
            <ul className="bh-card__body" style={{ margin: "0 0 12px", paddingLeft: 18 }}>
              <li>
                Early access to retrieval trained on your organization&apos;s documents, with
                monthly retraining behind the same deploy gates that gate our own releases
              </li>
              <li>Direct input on the method-registry roadmap</li>
              <li>A direct line to the research team</li>
            </ul>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <a
                className="bh-btn bh-btn--primary bh-btn--hero"
                href="https://bhenre.com/contact?topic=design-partner"
              >
                Reserve a design-partner seat
              </a>
              <a
                className="bh-btn bh-btn--ghost"
                href="https://bhenre.com/contact?topic=managed-embeddings"
              >
                Ask about a custom corpus
              </a>
              <a href="https://bhenre.com/store">or see the store →</a>
            </div>
            <Marginalia>
              Each partner workspace trains behind the same evaluation gates that gate our own deploys.
            </Marginalia>
          </div>
        </RuledSection>

        <CrossSellStrip siteId="research" />
      </Axis>
    </>
  );
}
