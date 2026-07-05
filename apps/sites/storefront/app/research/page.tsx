import Link from "next/link";
import { PageHeader, siteHref } from "@synthaembed/ui-fleet";import { getSite, getSiteCircuit, GLOSSARY, RE } from "@synthaembed/fleet";import experiments from "../../data/experiments.json";

export const metadata = {
  title: `${GLOSSARY.experimentMuseum} — Storefront`,
};

const EVIDENCE_BASE = "https://github.com/jcdavis131/bluehenre/blob/main/EVIDENCE.md";

function evidenceRefHref(ref: string): string {
  const hash = ref.includes("#") ? ref.split("#")[1] : ref.replace(/^EVIDENCE\.md#?/, "");
  return hash ? `${EVIDENCE_BASE}#${hash.replace(/\./g, "-")}` : EVIDENCE_BASE;
}

export default function ResearchPage() {
  const surface = getSiteCircuit("storefront");
  const researchRag = getSite("research");
  const local = process.env.NEXT_PUBLIC_FLEET_LOCAL === "1";
  const registryHref = researchRag ? `${siteHref(researchRag, local)}/research-lab` : null;

  return (
    <>
      <PageHeader
        eyebrow={`R&D · ${surface?.eyebrow}`}
        title={GLOSSARY.experimentMuseum}
        lead={
          <>
            Evidence-backed experiment summaries. Background evaluation continues.{" "}
            {registryHref && (
              <Link href={registryHref}>Full registry on Applied Research →</Link>
            )}
          </>
        }
        badge={<span className="bh-badge bh-badge--ok">{RE.relay}</span>}
      />

      <div className="bh-grid">
        {experiments.experiments.map((e) => (
          <article key={e.id} className="bh-card bh-card--column">
            <h3 className="bh-card__title">{e.title}</h3>
            <p className="bh-card__body">{e.verdict}</p>
            <div className="bh-meta">
              {e.runs} runs ·{" "}
              <a href={evidenceRefHref(e.ref)} target="_blank" rel="noopener noreferrer">
                {e.ref}
              </a>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
