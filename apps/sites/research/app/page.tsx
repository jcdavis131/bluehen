import { ArxivExamDemo } from "../components/ArxivExamDemo";
import { ArxivSearchHero } from "../components/ArxivSearchHero";
import {
  Axis,
  Marginalia,
  RuledSection,
  StatusLine,
  TitleCard,
  TeamStrip,
} from "@synthaembed/ui-fleet";
import { getSiteCircuit, GLOSSARY, RE } from "@synthaembed/fleet";
import Link from "next/link";

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
            Type a question — get ranked paper chunks from our production arXiv index. Same stack we run
            for customers.{" "}
            <Link href="/research-lab">
              Browse the {GLOSSARY.experimentMuseum.toLowerCase()} →
            </Link>
          </p>
        </TitleCard>

        <TeamStrip siteId="research" />

        <RuledSection label="Try it">
          <ArxivSearchHero />
        </RuledSection>

        <RuledSection label="Engineering deep dive">
          <ArxivExamDemo />
        </RuledSection>

        <RuledSection label="Use this on your own papers">
          <div className="bh-card bh-card--organic">
            <div className="bh-card__title">Design-partner seats</div>
            <p className="bh-card__body">
              Design-partner seats get a dedicated workspace: your corpus, monthly
              retraining behind deploy gates, and direct roadmap input. First cohort,
              quarterly terms.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a className="bh-btn bh-btn--primary bh-btn--hero" href="https://bhenre.com/store">
                Reserve a design-partner seat
              </a>
              <a
                className="bh-btn bh-btn--ghost"
                href="https://bhenre.com/contact?topic=managed-embeddings"
              >
                Ask about a custom corpus
              </a>
            </div>
            <Marginalia>
              Each partner workspace trains behind the same evaluation gates as our own deploys.
            </Marginalia>
          </div>
        </RuledSection>
      </Axis>
    </>
  );
}
