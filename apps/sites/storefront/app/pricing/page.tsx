import { PageHeader, RuledSection } from "@synthaembed/ui-fleet";
import Link from "next/link";

export const metadata = {
  title: "Pricing — Blue Hen RE",
  description:
    "Published API pricing (Spec 0034): an instant Free tier, metered Builder and Pro tiers, and pay-per-use dataset and certification runs.",
};

type PriceEntry = { usd?: number; recurring?: string | null; grants?: string };

type PricingResponse = {
  prices?: Record<string, PriceEntry>;
  freeTier?: { meteredCallsPerMonth?: number; corpora?: number; corpusDocs?: number };
  signup?: string;
  paymentsLive?: boolean;
};

/** Server-side fetch of the published price list (Spec 0034 §1, §4 —
 * "pricing published without human quoting"). No key needed: /v1/pricing is
 * public. Falls back to null on any failure so a build/render never breaks
 * because core-api is briefly unreachable — the honest defaults below cover
 * that case. */
async function fetchPricing(): Promise<PricingResponse | null> {
  const baseUrl = process.env.SYNTH_API_BASE_URL ?? "http://localhost:8000";
  try {
    const res = await fetch(`${baseUrl}/v1/pricing`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PricingResponse;
  } catch {
    return null;
  }
}

const PAYMENTS_PENDING_LINE =
  "Payments connect soon — usage is metered honestly today, and early free-tier users keep generous grandfathering.";

const LEGACY_ENGAGEMENTS = [
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

export default async function PricingPage() {
  const pricing = await fetchPricing();
  const freeTier = pricing?.freeTier;
  const prices = pricing?.prices ?? {};
  const paymentsLive = pricing?.paymentsLive ?? false;

  const builder = prices["api-builder"];
  const pro = prices["api-pro"];
  const dataset = prices["dataset"];
  const certification = prices["certification"];

  return (
    <>
      <PageHeader
        eyebrow="Commerce"
        title="Pricing"
        lead="Published without human quoting (Spec 0034): an instant Free-tier key, two metered API tiers, and pay-per-use dataset and certification runs."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        <div className="bh-card">
          <div className="bh-card__title">API Free</div>
          <p className="bh-card__body" style={{ fontWeight: 600 }}>$0</p>
          <p className="bh-card__body">
            Instant self-serve key — no briefing, no human, issued in one call.
          </p>
          <ul className="bh-card__body">
            <li>{freeTier?.meteredCallsPerMonth ?? 1000} metered calls / month</li>
            <li>
              {freeTier?.corpora ?? 1} corpus, up to {freeTier?.corpusDocs ?? 50} docs
            </li>
            <li>Same production API every paid tier uses</li>
          </ul>
          <Link className="bh-btn bh-btn--primary" href="/developers">
            Get an instant key
          </Link>
        </div>

        <div className="bh-card">
          <div className="bh-card__title">API Builder</div>
          <p className="bh-card__body" style={{ fontWeight: 600 }}>
            ${builder?.usd ?? 29}/mo
          </p>
          <ul className="bh-card__body">
            <li>50,000 metered calls / month</li>
            <li>3 corpora</li>
            <li>Auto-retrain</li>
          </ul>
          {!paymentsLive && (
            <p className="bh-card__body" style={{ fontStyle: "italic" }}>
              {PAYMENTS_PENDING_LINE}
            </p>
          )}
          <Link className="bh-btn" href="/developers">
            Start on Free, upgrade later
          </Link>
        </div>

        <div className="bh-card">
          <div className="bh-card__title">API Pro</div>
          <p className="bh-card__body" style={{ fontWeight: 600 }}>
            ${pro?.usd ?? 99}/mo
          </p>
          <ul className="bh-card__body">
            <li>500,000 metered calls / month</li>
            <li>10 corpora</li>
            <li>Priority queue</li>
          </ul>
          {!paymentsLive && (
            <p className="bh-card__body" style={{ fontStyle: "italic" }}>
              {PAYMENTS_PENDING_LINE}
            </p>
          )}
          <Link className="bh-btn" href="/developers">
            Start on Free, upgrade later
          </Link>
        </div>
      </div>

      <div className="bh-table-wrap" style={{ marginTop: 16 }}>
        <table className="bh-table">
          <tbody>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th>Fulfillment</th>
            </tr>
            <tr>
              <td>Dataset access</td>
              <td>${dataset?.usd ?? 49} one-time / dataset</td>
              <td>Existing entitlement grant, now webhook-driven</td>
            </tr>
            <tr>
              <td>Certification run</td>
              <td>${certification?.usd ?? 99}/run</td>
              <td>Existing automated pipeline, payment-gated</td>
            </tr>
          </tbody>
        </table>
      </div>
      {!paymentsLive && (
        <p className="bh-meta" style={{ marginTop: 8 }}>
          {PAYMENTS_PENDING_LINE}
        </p>
      )}

      <RuledSection label="Consulting engagements (optional add-on)">
        <p className="bh-card__body">
          The API is the business now — these engagements remain available
          for teams that want a dedicated evaluation, deployment, or platform
          partnership alongside self-serve usage.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {LEGACY_ENGAGEMENTS.map((t) => (
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
          <div className="bh-card__title">Games and evaluation credits</div>
          <p className="bh-card__body">
            Evaluation credits and design-partner seats are sold directly in
            the <Link href="/store">store</Link> when available. Terms:{" "}
            <Link href="/legal/terms">service terms</Link> ·{" "}
            <Link href="/legal/privacy">privacy</Link>.
          </p>
        </div>
      </RuledSection>
    </>
  );
}
