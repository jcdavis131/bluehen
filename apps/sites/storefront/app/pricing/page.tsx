import { PageHeader } from "@synthaembed/ui-fleet";
import Link from "next/link";

export const metadata = {
  title: "Pricing — Blue Hen RE",
  description: "Engagement packages: evaluation sprint, managed embeddings, and enterprise platform.",
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
    body: "The full operating loop (data collection, training, evaluation, serving, and observability) deployed in your cloud, with our team operating it alongside yours.",
    items: ["Private deployment", "Custom eval suites and SLAs", "Quarterly architecture reviews"],
    cta: { label: "Start a briefing", href: "/contact?topic=enterprise" },
  },
];

export default function PricingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Commerce"
        title="Pricing"
        lead="Three engagement shapes. Every claim in a proposal traces to a measured result, the same rule the platform holds itself to."
      />
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
