import { PageHeader, RuledSection } from "@synthaembed/ui-fleet";
import Link from "next/link";
import { SmartLink } from "../../components/SmartLink";
import { listBusinessUnitOffers } from "../../lib/offers";

export const metadata = {
  title: "Pricing — Blue Hen RE",
  description:
    "Platform engagements — evaluation sprint, managed embeddings, enterprise platform — plus the business-unit offers they build on.",
};

const TIERS = [
  {
    name: "Evaluation Sprint",
    price: "Fixed fee",
    body: "Two-week benchmark of your retrieval stack against our measured baselines: nDCG@10, effective rank, and cost per query on your corpus. You keep the report and the harness.",
    items: ["Your corpus, our eval harness", "Written findings with reproduction steps", "Go/no-go recommendation"],
    cta: { label: "Book a sprint", href: "/contact?topic=evaluation-sprint" },
  },
  {
    name: "Managed Embeddings",
    price: "Monthly",
    body: "A dedicated tenant on the platform: domain-tuned embedding models behind a scoped API, retrained on your cadence with deploy gates enforced before every promotion.",
    items: ["Isolated workspace (row-level security)", "Deploy gates: no silent regressions", "Usage-metered API with budget ceilings"],
    cta: { label: "Discuss scope", href: "/contact?topic=managed-embeddings" },
  },
  {
    name: "Enterprise Platform",
    price: "Annual",
    body: "The full operating loop — data collection, training, evaluation, serving, and observability — deployed in your cloud with our team operating it alongside yours.",
    items: ["Private deployment", "Custom eval suites and SLAs", "Quarterly architecture reviews"],
    cta: { label: "Start a briefing", href: "/contact?topic=enterprise" },
  },
];

export default function PricingPage() {
  const offers = listBusinessUnitOffers();

  return (
    <>
      <PageHeader
        eyebrow="Commerce"
        title="Pricing"
        lead={
          <>
            Two ways to buy. Engage the <strong>platform</strong> directly —
            three engagement shapes below — or start with one of the{" "}
            <Link href="/offers">{offers.length} business-unit offers</Link>{" "}
            the platform operates. Every claim in a proposal traces to a
            measured result — the same rule the platform holds itself to.
          </>
        }
      />

      <RuledSection label="Platform engagements">
        <p className="bh-card__body" style={{ maxWidth: 640, marginBottom: 16 }}>
          These three shapes engage the platform itself — the governed
          lifecycle that every business unit runs on.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {TIERS.map((t) => (
            <div key={t.name} className="bh-card">
              <div className="bh-card__title">{t.name}</div>
              <p className="bh-card__body" style={{ fontWeight: 600 }}>{t.price}</p>
              <p className="bh-card__body">{t.body}</p>
              <ul className="bh-card__body">
                {t.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              <Link className="bh-btn" href={t.cta.href}>
                {t.cta.label}
              </Link>
            </div>
          ))}
        </div>
      </RuledSection>

      <RuledSection label="Business-unit offers">
        <p className="bh-card__body" style={{ maxWidth: 640, marginBottom: 16 }}>
          Each business unit also sells on its own site. The full portfolio —
          offer, ask, and direct conversion path per unit — is on{" "}
          <Link href="/offers">What we sell</Link>. In brief:
        </p>
        <div className="bh-grid bh-grid--2">
          {offers.map((o) => (
            <SmartLink
              key={o.id}
              href={o.primary.href}
              className="bh-card"
              style={{ display: "block" }}
            >
              <p className="bh-card__title">{o.unit}</p>
              <p className="bh-card__body">{o.offer}</p>
              <p className="bh-meta" style={{ marginTop: 8 }}>
                {o.ask} · {o.primary.label} · {o.domain}
              </p>
            </SmartLink>
          ))}
        </div>
      </RuledSection>

      <div className="bh-card" style={{ marginTop: 16 }}>
        <div className="bh-card__title">Self-serve</div>
        <p className="bh-card__body">
          Evaluation credits and design-partner seats are sold directly in the{" "}
          <Link href="/store">store</Link> when available. Terms:{" "}
          <Link href="/legal/terms">service terms</Link> ·{" "}
          <Link href="/legal/privacy">privacy</Link>.
        </p>
      </div>
    </>
  );
}
