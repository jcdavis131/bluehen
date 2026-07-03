/**
 * Portfolio offer matrix — UX-110/111 (Spec 0020 §3.3).
 *
 * One entry per revenue-bearing business unit, derived from the fleet
 * registry: the unit set comes from `orgRole === "business-unit"` in
 * config/fleet.json, and names/domains/offer copy come from the registry
 * (`venture` blocks + SITE_CIRCUIT narrative). UNIT_ASKS only pins the ask
 * category and the conversion path each unit actually sells through; a unit
 * without an entry falls back to its authored venture CTA, so a new business
 * unit appears here automatically instead of vanishing.
 *
 * No prices are authored anywhere in the repo, so the ask is the verb, never
 * a number (Spec 0020 non-goal: pricing amounts are an Operator decision).
 */

import { getSiteCircuit, listSites, type FleetSite } from "@synthaembed/fleet";
import { siteHref } from "@synthaembed/ui-fleet";

export interface OfferCta {
  label: string;
  href: string;
}

export interface BusinessUnitOffer {
  id: string;
  /** Business-unit name (SITE_CIRCUIT stop, e.g. "Validation Lab"). */
  unit: string;
  /** Registry domain (auto-corrects when config/fleet.json changes). */
  domain: string;
  /** "Unit · domain" line — built from the registry so the displayed domain
   *  always matches where the CTA actually links. */
  eyebrow: string;
  /** The offer in one sentence — from the registry venture block. */
  offer: string;
  /** The ask category: free / paid run / seat / engagement / waitlist. */
  ask: string;
  askDetail?: string;
  primary: OfferCta;
  secondary?: OfferCta;
}

/** Display order follows the ask ladder: free → fee → seat → dataset → waitlist.
 *  Units not listed here sort after these, in registry order. */
const OFFER_ORDER = [
  "dumbmodel",
  "validation",
  "research",
  "refinery",
  "simulation",
];

/** Absolute URL for a path on a business unit's own site. */
function unitUrl(site: FleetSite, path?: string): string {
  if (path?.startsWith("http")) return path; // already absolute in the registry
  const base = siteHref(site);
  if (base === "#" || !path || path === "/") return base;
  return `${base}${path}`;
}

type UnitAsk = Pick<BusinessUnitOffer, "ask" | "askDetail" | "primary" | "secondary">;

const UNIT_ASKS: Record<string, (site: FleetSite) => UnitAsk> = {
  dumbmodel: (s) => ({
    ask: "Free",
    askDetail: "No signup — paste text, get measured collapse diagnostics.",
    primary: {
      label: s.venture?.cta?.label ?? "Run the free health check",
      href: unitUrl(s, s.venture?.cta?.href ?? "/check"),
    },
    secondary: { label: "Evaluation credits in the store", href: "/store" },
  }),
  validation: (s) => ({
    ask: "Paid certification run",
    askDetail: "Reproducible benchmark run; scope set per engagement.",
    primary: {
      label: s.venture?.cta?.label ?? "Get your RAG certified",
      href: unitUrl(s, s.venture?.cta?.href ?? "/certify"),
    },
    secondary: { label: "Published scorecards", href: unitUrl(s, "/scorecards") },
  }),
  // The registry's authored CTA for research still points at the generic
  // store (UX-112 gives the seat a dedicated anchor); per Spec 0020 the
  // conversion point is the unit's own live assistant + a scoped briefing.
  research: (s) => ({
    ask: "Design-partner seat",
    askDetail: "The live retrieval assistant is the working demo.",
    primary: { label: "Try the live research assistant", href: unitUrl(s) },
    secondary: {
      label: "Discuss a design-partner seat",
      href: "/contact?topic=design-partner",
    },
  }),
  refinery: (s) => ({
    ask: "Dataset & harvest engagements",
    askDetail: "Provenance-carrying datasets; custom harvests scoped on request.",
    primary: { label: "Browse the dataset catalog", href: unitUrl(s, "/catalog") },
    secondary: { label: "Request a custom harvest", href: unitUrl(s, "/requests") },
  }),
  simulation: (s) => ({
    ask: "Waitlist",
    askDetail: "Paper-trading strategy reports — simulation only, no live trading.",
    primary: {
      label: s.venture?.cta?.label ?? "Join the waitlist",
      href: unitUrl(s, s.venture?.cta?.href),
    },
  }),
};

/** Fallback for a unit without a pinned ask: use its registry CTA verbatim. */
function defaultAsk(site: FleetSite): UnitAsk {
  return {
    ask: "Direct engagement",
    primary: site.venture?.cta
      ? { label: site.venture.cta.label, href: unitUrl(site, site.venture.cta.href) }
      : { label: `Visit ${site.domain}`, href: unitUrl(site) },
  };
}

/** All active business-unit offers, registry-sourced, in ask-ladder order. */
export function listBusinessUnitOffers(): BusinessUnitOffer[] {
  const orderOf = (id: string) => {
    const i = OFFER_ORDER.indexOf(id);
    return i === -1 ? OFFER_ORDER.length : i;
  };
  return listSites({ status: "active" })
    .filter((s): s is FleetSite & { domain: string } => s.orgRole === "business-unit" && !!s.domain)
    .sort((a, b) => orderOf(a.id) - orderOf(b.id))
    .map((site) => {
      const circuit = getSiteCircuit(site.id);
      const unit = circuit?.stop ?? site.name;
      const v = site.venture;
      return {
        id: site.id,
        unit,
        domain: site.domain,
        eyebrow: `${unit} · ${site.domain}`,
        offer: v?.valueProp ?? v?.offer ?? circuit?.role ?? site.description,
        ...(UNIT_ASKS[site.id] ?? defaultAsk)(site),
      };
    });
}
