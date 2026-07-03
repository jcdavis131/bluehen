import { BRAND, getSiteCircuit, listSites, type FleetSite } from "@synthaembed/fleet";
import { siteHref } from "./urls";

/** Cross-sell strip (Spec 0020, UX-113): registry-driven "Also from Blue Hen RE"
 * section for BU homepages — visible links to the sibling business units plus
 * the company site, instead of relying on the collapsed fleet-switcher. No
 * per-site copy to drift: names and offers come from the fleet registry. */
export function CrossSellStrip({ siteId }: { siteId: string }) {
  const active = listSites({ status: "active" });
  const units = active.filter(
    (s) => s.orgRole === "business-unit" && s.domain && s.id !== siteId,
  );
  const company = active.find((s) => s.orgRole === "company" && s.id !== siteId);
  if (units.length === 0 && !company) return null;

  return (
    <section className="bh-cross-sell" aria-label={`Also from ${BRAND.name}`}>
      <span className="bh-cross-sell__label">Also from {BRAND.name}</span>
      <div className="bh-cross-sell__grid">
        {units.map((s) => (
          <CrossSellCard key={s.id} site={s} meta={s.domain ?? undefined} />
        ))}
        {company && (
          <CrossSellCard site={company} meta="the company →" company />
        )}
      </div>
    </section>
  );
}

function CrossSellCard({
  site,
  meta,
  company = false,
}: {
  site: FleetSite;
  meta?: string;
  company?: boolean;
}) {
  const stop = getSiteCircuit(site.id);
  return (
    <a
      href={siteHref(site)}
      className={`bh-cross-sell__card${company ? " bh-cross-sell__card--company" : ""}`}
    >
      <span className="bh-cross-sell__name">{stop?.stop ?? site.name}</span>
      <span className="bh-cross-sell__role">{stop?.role ?? site.role}</span>
      {meta ? <span className="bh-cross-sell__meta">{meta}</span> : null}
    </a>
  );
}
