export type SiteStatus = "active" | "planned" | "deprecated";
export type SitePhase = "A" | "B" | "C" | "all";
export type OrgDivisionId =
  | "data"
  | "research"
  | "bd"
  | "execution"
  | "orchestration";

/** Venture/offer metadata for revenue-bearing units (Specs 0015, 0018, 0019).
 *  Authored in config/fleet.json; shapes vary slightly per unit, so every
 *  field is optional. */
export interface SiteVenture {
  valueProp?: string;
  cta?: { label: string; href: string };
  monetization?: string;
  dataConsent?: string;
  /** Refinery-style shape (Spec 0018) */
  offer?: string;
  revenue?: string;
  spec?: string;
}

export interface FleetSite {
  id: string;
  name: string;
  domain: string | null;
  phase: SitePhase;
  role: string;
  /** Corporate topology (Spec 0019): one company site, revenue-bearing
   *  business units, internal consoles. Chrome derives groups from this. */
  orgRole?: "company" | "business-unit" | "internal";
  /** Primary functional division — Spec 0012 */
  orgDivision?: OrgDivisionId;
  secondaryDivisions?: OrgDivisionId[];
  deliversTo?: OrgDivisionId[];
  expectsFrom?: OrgDivisionId[];
  appPath: string;
  package: string;
  port: number | null;
  vercelPreview: string | null;
  status: SiteStatus;
  legacyRepo: string | null;
  description: string;
  /** Present on revenue-bearing units — the authored offer/CTA metadata. */
  venture?: SiteVenture;
}

export interface FleetPlatform {
  name: string;
  tagline: string;
  codename: string;
  repo: string;
  agentApp: string;
  controlApp: string;
  coreApi: string;
  trainer: string;
}

export interface FleetConfig {
  version: number;
  platform: FleetPlatform;
  /** Companion registry — specs/0012, config/org-divisions.json */
  orgDivisions?: string;
  sites: FleetSite[];
}
