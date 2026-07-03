import { BRAND, DIVISION_RELAY, getSite, getSiteCircuit } from "@synthaembed/fleet";

/** Business-unit identity strip (Spec 0019 §2.4): which division runs
 * this surface, what it offers, and whose company it is. Registry-driven —
 * no per-site copy to drift. */
export function TeamStrip({ siteId }: { siteId: string }) {
  const site = getSite(siteId);
  const stop = getSiteCircuit(siteId);
  const division = site?.orgDivision ? DIVISION_RELAY[site.orgDivision] : null;
  if (!stop) return null;

  return (
    <aside className="bh-team-strip" aria-label="About this business unit">
      <span className="bh-team-strip__division">
        {division ? division.leg : "Blue Hen RE"}
      </span>
      <span className="bh-team-strip__offer">{stop.role}</span>
      <a className="bh-team-strip__byline" href="https://bhenre.com">
        a {BRAND.name} company →
      </a>
    </aside>
  );
}
