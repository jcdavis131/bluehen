import Link from "next/link";
import { PageHeader, SiteSubnav, siteHref } from "@synthaembed/ui-fleet";
import { getSite, getSiteCircuit, getSiteNav, GLOSSARY, RE } from "@synthaembed/fleet";
import experiments from "../../data/experiments.json";

export const metadata = {
  title: `${GLOSSARY.experimentMuseum} — Platform Console`,
};

export default function ResearchPage() {
  const surface = getSiteCircuit("hub");
  const nav = getSiteNav("hub");
  const researchRag = getSite("research-rag");
  const local = process.env.NEXT_PUBLIC_FLEET_LOCAL === "1";
  const registryHref = researchRag ? `${siteHref(researchRag, local)}/research-lab` : null;

  return (
    <>
      <PageHeader
        eyebrow={`R&D · ${surface?.eyebrow}`}
        title={GLOSSARY.experimentMuseum}
        lead={
          <>
            Evidence-backed experiment summaries — background evaluation continues.{" "}
            {registryHref && (
              <Link href={registryHref}>Full registry on Applied Research →</Link>
            )}
          </>
        }
        badge={<span className="bh-badge bh-badge--ok">{RE.relay}</span>}
      />
      <SiteSubnav items={nav} currentPath="/research" />

      <div className="bh-grid">
        {experiments.experiments.map((e) => (
          <article key={e.id} className="bh-card bh-card--column">
            <h3 className="bh-card__title">{e.title}</h3>
            <p className="bh-card__body">{e.verdict}</p>
            <div className="bh-meta">
              {e.runs} runs · {e.ref}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
