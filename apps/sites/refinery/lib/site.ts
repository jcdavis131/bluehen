import { getSite } from "@synthaembed/fleet";
import { siteHref } from "@synthaembed/ui-fleet";

/**
 * Registry-driven canonical origin (UX-108) — resolved from the refinery
 * entry in config/fleet.json. When the Operator flips the domain at the
 * G1 gate, metadataBase, sitemap, and robots follow automatically.
 */
const site = getSite("refinery");

if (!site?.domain) {
  throw new Error("config/fleet.json: refinery entry must define a domain");
}

export const SITE_ORIGIN = siteHref(site, false);
