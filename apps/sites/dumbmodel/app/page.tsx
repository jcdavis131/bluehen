import Link from "next/link";
import { ConeMascot, HenMascot } from "@/components/site";
import {
  Axis,
  Marginalia,
  RuledSection,
  StatusLine,
  TitleCard,
  TeamStrip,
} from "@synthaembed/ui-fleet";
import { BRAND, getSiteCircuit, RE } from "@synthaembed/fleet";

export const metadata = {
  title: "Dumb Model — how dumb is your embedding?",
  description:
    "Paste your text, get measured diagnostics — effective rank, space utilization, redundancy. Free, no signup.",
};

export default function HomePage() {
  const surface = getSiteCircuit("dumbmodel");

  return (
    <>
      <StatusLine
        site="dumbmodel.com"
        section="Public proof"
        status="Anti-hype diagnostics"
      />

      <Axis>
        <TitleCard
          eyebrow={surface?.eyebrow}
          title="How dumb is your model?"
          marginalia={`${RE.relay} proof · ${RE.tech} measured`}
        >
          <span className="bh-title-card__mascot" style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <ConeMascot size={40} />
            <span className="bh-muted">vs</span>
            <HenMascot size={40} />
          </span>
          <p className="bh-title-card__copy">
            Paste your text, get measured diagnostics in seconds — effective rank, space
            utilization, redundancy — under a production embedding model. Free, no signup.
            Benchmarks measured on {BRAND.name} eval gates, not marketing claims.
          </p>
        </TitleCard>

      <TeamStrip siteId="dumbmodel" />

        <RuledSection label="Run the diagnostics">
          <div className="bh-stack" style={{ gap: 16 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <Link href="/check" className="bh-btn bh-btn--primary bh-btn--hero">
                Run the free health check
              </Link>
              <Link href="/compare" className="bh-btn bh-btn--ghost">
                Compare models
              </Link>
              <Link href="/hall" className="bh-btn bh-btn--ghost">
                Hall of Cone
              </Link>
              <Link href="/museum" className="bh-btn bh-btn--ghost">
                Museum of Collapse
              </Link>
              <a
                href="https://bhenre.com"
                className="bh-btn bh-btn--hen"
                target="_blank"
                rel="noopener noreferrer"
              >
                Platform Console →
              </a>
            </div>
            <Marginalia>
              Every score traces to a reproducible eval gate — nDCG, effective rank, rotating slice.
            </Marginalia>
          </div>
        </RuledSection>

        <RuledSection label="What you get">
          <div className="bh-grid bh-grid--2">
            <div className="bh-card">
              <h2 className="bh-card__title bh-card__title--lg">Collapse score</h2>
              <p className="bh-card__body">
                Effective rank and retrieval on a rotating slice, summarized for sharing. Higher
                collapse = lower effective rank. Org-trained models typically score better.
              </p>
            </div>
            <div className="bh-card">
              <h2 className="bh-card__title bh-card__title--lg">Side-by-side RAG</h2>
              <p className="bh-card__body">
                Same query, same corpus — compare a commercial baseline against an org-trained model
                on multi-hop retrieval tasks.
              </p>
            </div>
            <div className="bh-card">
              <h2 className="bh-card__title bh-card__title--lg">Hall of Cone</h2>
              <p className="bh-card__body">
                Reference panel of baseline embedders ranked by effective rank. Validate improvements
                on the Validation Lab (slasso.com).
              </p>
            </div>
            <div className="bh-card">
              <h2 className="bh-card__title bh-card__title--lg">Museum of Collapse</h2>
              <p className="bh-card__body">
                The failure modes we measure against — anisotropy, dimension starvation, MRL
                truncation cliffs — each with the diagnostic or gate that catches it before a model
                ships.
              </p>
            </div>
            <div className="bh-card">
              <h2 className="bh-card__title bh-card__title--lg">{BRAND.name}</h2>
              <p className="bh-card__body">
                {RE.relay} for governed embedding operations · {RE.tech} in production. Enterprise
                lifecycle: measure, validate, deploy, improve.
              </p>
            </div>
          </div>
        </RuledSection>
      </Axis>
    </>
  );
}
