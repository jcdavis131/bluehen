import Link from "next/link";
import { ConeMascot, HenMascot } from "@/components/site";
import { PageHeader, SiteSubnav } from "@synthaembed/ui-fleet";
import { BRAND, getSiteCircuit, getSiteNav, RE } from "@synthaembed/fleet";

export default function HomePage() {
  const surface = getSiteCircuit("dumbmodel");
  const nav = getSiteNav("dumbmodel");

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="How dumb is your model?"
        lead={
          <>
            Paste your text, get measured diagnostics in seconds — effective rank, space
            utilization, redundancy — under a production embedding model. Free, no signup.
            Benchmarks measured on {BRAND.name} eval gates, not marketing claims.
          </>
        }
        badge={
          <span style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <ConeMascot size={48} />
            <span className="bh-muted">vs</span>
            <HenMascot size={48} />
          </span>
        }
      />
      <SiteSubnav items={nav} currentPath="/" />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--bh-space-3)", marginBottom: "var(--bh-space-8)" }}>
        <Link href="/check" className="bh-btn bh-btn--primary">
          Run the free health check
        </Link>
        <Link href="/compare" className="bh-btn bh-btn--ghost">
          Compare models
        </Link>
        <Link href="/hall" className="bh-btn bh-btn--ghost">
          Hall of Cone
        </Link>
        <a href="https://bhenre.com" className="bh-btn bh-btn--hen" target="_blank" rel="noopener noreferrer">
          Platform Console →
        </a>
      </div>

      <div className="bh-grid bh-grid--2">
        <div className="bh-card">
          <h2 className="bh-card__title bh-card__title--lg">Collapse score</h2>
          <p className="bh-card__body">
            Effective rank and retrieval on a rotating slice, summarized for sharing. Higher collapse
            = lower effective rank. Org-trained models typically score better.
          </p>
        </div>
        <div className="bh-card">
          <h2 className="bh-card__title bh-card__title--lg">Side-by-side RAG</h2>
          <p className="bh-card__body">
            Same query, same corpus — compare a commercial baseline against an org-trained model on
            multi-hop retrieval tasks.
          </p>
        </div>
        <div className="bh-card">
          <h2 className="bh-card__title bh-card__title--lg">Hall of Cone</h2>
          <p className="bh-card__body">
            Reference panel of baseline embedders ranked by effective rank. Validate improvements on
            the Validation Lab (slasso.com).
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
    </>
  );
}
