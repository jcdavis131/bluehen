export type SiteStatus = "active" | "planned" | "deprecated";
export type SitePhase = "A" | "B" | "C" | "all";
export type OrgDivisionId =
  | "data"
  | "research"
  | "bd"
  | "execution"
  | "orchestration";

export interface FleetSite {
  id: string;
  name: string;
  domain: string | null;
  phase: SitePhase;
  role: string;
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
