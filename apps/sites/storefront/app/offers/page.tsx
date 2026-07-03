import { PageHeader, Reveal, RuledSection } from "@synthaembed/ui-fleet";
import { BRAND } from "@synthaembed/fleet";
import Link from "next/link";
import { SmartLink } from "../../components/SmartLink";
import { listBusinessUnitOffers, type OfferCta } from "../../lib/offers";

export const metadata = {
  title: "What We Sell — Blue Hen RE",
  description:
    "The portfolio: every business-unit offer on one governed lifecycle — engage a single unit or the set.",
};

function CtaLink({ cta, primary }: { cta: OfferCta; primary?: boolean }) {
  return (
    <SmartLink
      className={primary ? "bh-btn bh-btn--primary" : "bh-btn bh-btn--ghost"}
      href={cta.href}
    >
      {cta.label}
    </SmartLink>
  );
}

export default function OffersPage() {
  const offers = listBusinessUnitOffers();

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="What we sell"
        lead={
          <>
            {BRAND.name} is one company with {offers.length} offers on a
            single governed lifecycle — each business unit builds, serves, and
            earns, and publishes its results back into the loop. This page
            lists all {offers.length} in one place: the offer, the ask, and
            the direct path to engage. Take a single unit, or the set.
          </>
        }
      />

      <div className="bh-stack" style={{ gap: 16 }}>
        {offers.map((o, i) => (
          <Reveal key={o.id} index={i}>
            <article className="bh-card">
              <span className="bh-eyebrow">{o.eyebrow}</span>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "baseline",
                  gap: "6px 12px",
                  marginTop: 6,
                }}
              >
                <h2 className="bh-card__title" style={{ margin: 0 }}>
                  {o.unit}
                </h2>
                <span className="bh-badge">{o.ask}</span>
              </div>
              <p className="bh-card__body" style={{ maxWidth: 640 }}>
                {o.offer}
              </p>
              {o.askDetail && <p className="bh-meta">{o.askDetail}</p>}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                <CtaLink cta={o.primary} primary />
                {o.secondary && <CtaLink cta={o.secondary} />}
              </div>
            </article>
          </Reveal>
        ))}
      </div>

      <RuledSection label="Engage the platform">
        <div className="bh-card">
          <div className="bh-card__title">The units combine</div>
          <p className="bh-card__body" style={{ maxWidth: 640 }}>
            Every unit above runs on the same platform and ships through the
            same evaluation gates. To engage the platform itself — an
            evaluation sprint, managed embeddings, or a private deployment —
            see <Link href="/pricing">pricing</Link>. For a scope that spans
            more than one unit, <Link href="/contact?topic=portfolio">
            start a portfolio briefing</Link>.
          </p>
        </div>
      </RuledSection>
    </>
  );
}
