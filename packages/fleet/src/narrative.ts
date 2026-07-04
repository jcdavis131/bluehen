/**
 * Blue Hen RE, enterprise platform narrative
 *
 * Public brand: B2B embedding operations, governed lifecycle, measurable gates.
 * Technical layer: RAG Embeddings (unchanged in API & specs).
 *
 * @see docs/VOICE_AND_PLATFORM.md
 */

import type { OrgDivisionId } from "./types";

/** Dual meaning of RE — always pair both in customer-facing copy. */
export const RE = {
  /** Organizational platform brand */
  relay: "Relay Engine",
  /** Technical product (API, whitepaper, eval) */
  tech: "RAG Embeddings",
  /** One-line for footers */
  dual: "Relay Engine · RAG Embeddings",
} as const;

export const BRAND = {
  name: "Blue Hen RE",
  mascot: "Blue Hen",
  /** Closed-loop improvement model across five divisions */
  operatingLoop: "The Operating Loop",
  /** @deprecated alias — use operatingLoop */
  circuit: "The Operating Loop",
  tagline: "Measure. Validate. Deploy. Improve.",
  platform: "SynthaEmbed OS",
} as const;

/** Enterprise division names (Spec 0012). */
export const DIVISION_RELAY: Record<
  OrgDivisionId,
  { leg: string; short: string; baton: string; verb: string }
> = {
  orchestration: {
    leg: "Platform Orchestration",
    short: "Orchestrate",
    baton: "priorities & budgets",
    verb: "coordinates the fleet",
  },
  data: {
    leg: "Data Operations",
    short: "Data",
    baton: "curated corpora",
    verb: "ingests and prepares data",
  },
  research: {
    leg: "Research & Development",
    short: "R&D",
    baton: "recipes & evidence",
    verb: "trains and evaluates models",
  },
  bd: {
    leg: "Validation & Charter",
    short: "Validate",
    baton: "production charter",
    verb: "certifies against benchmarks",
  },
  execution: {
    leg: "Production",
    short: "Produce",
    baton: "live serving metrics",
    verb: "deploys and serves models",
  },
};

/** Fleet sites as product surfaces. */
export const SITE_CIRCUIT: Record<
  string,
  { stop: string; role: string; eyebrow: string }
> = {
  storefront: {
    stop: "Storefront",
    role: "Company website at bhenre.com. Who Blue Hen RE is, the divisions, the operating loop, store and pricing.",
    eyebrow: "Storefront · bhenre.com",
  },
  hq: {
    stop: "Headquarters",
    role: "Internal cockpit at jcamd.com. Fleet directory, live operating loop, lifecycle controls.",
    eyebrow: "Headquarters · jcamd.com",
  },
  dumbmodel: {
    stop: "Baseline Comparison",
    role: "Diagnostics unit at dumbmodel.com. Free embedder health checks; funnel and consented data.",
    eyebrow: "Baseline Comparison · dumbmodel.com",
  },
  validation: {
    stop: "Validation Lab",
    role: "Certification unit at slasso.com. Paid RAG certification with published scorecards.",
    eyebrow: "Validation Lab · slasso.com",
  },
  research: {
    stop: "Applied Research",
    role: "Applied Research unit at arxiviq.com. Live retrieval assistant, method registry, case studies.",
    eyebrow: "Applied Research · arxiviq.com",
  },
  simulation: {
    stop: "Simulation Lab",
    role: "Signals unit. Paper-trading strategy reports, simulation only (Spec 0013).",
    eyebrow: "Simulation Lab · signals.bhenre.com",
  },
  refinery: {
    stop: "Data Refinery",
    role: "Data Operations unit at data.bhenre.com. Provenance-carrying datasets, custom harvests, dataset prep (Spec 0018).",
    eyebrow: "Data Refinery · data.bhenre.com",
  },
  observatory: {
    stop: "Observatory",
    role: "Internal telemetry. Run monitoring, effective rank, collapse alerts.",
    eyebrow: "Observatory · training.jcamd.com",
  },
};

/** UI terms — customer-facing rename map (API ids unchanged). */
export const GLOSSARY = {
  raceLog: "Operations Ledger",
  experimentLedger: "Operations Ledger",
  hillClimb: "Lifecycle Run",
  hillClimbVerb: "Run full lifecycle",
  bdQueue: "Validation Queue",
  experimentMuseum: "Research Registry",
  liveSearch: "Live Search",
  searchCorpus: "Search corpus",
  feedback: "Operations Feedback",
  feedbackVerb: "Submit feedback",
  deployedModel: "Production Model",
  budget: "Resource Budget",
  fleet: "Organization Fleet",
  closedLoop: "Operating Loop",
  baton: "Handoff",
  split: "Signal",
  qualifying: "Validation Pilot",
  evidence: "Evidence Records",
} as const;

/** Ledger stage → enterprise display label */
export const STAGE_RELAY: Record<string, string> = {
  collect: "data intake",
  chunk: "segmentation",
  pairs: "pair generation",
  train: "model training",
  eval: "evaluation",
  pilot: "validation pilot",
  charter: "production charter",
  deploy: "deployment",
  index: "index build",
  feedback: "operational feedback",
};

/** Shared subnav labels per site */
export const SITE_NAV: Record<string, { href: string; label: string }[]> = {
  storefront: [
    { href: "/", label: "Overview" },
    { href: "/try", label: "Live Search" },
    { href: "/research", label: "Research Registry" },
    { href: "/pricing", label: "Pricing" },
    { href: "/store", label: "Store" },
    { href: "/contact", label: "Contact" },
  ],
  hq: [
    { href: "/", label: "Fleet Map" },
    { href: "/org", label: "Org" },
    { href: "/actions", label: "Lifecycle Controls" },
    { href: "/org", label: "Org Reports" },
    { href: "/ops", label: "Division Ops" },
    { href: "/feedback", label: "Feedback" },
  ],
  dumbmodel: [
    { href: "/", label: "Overview" },
    { href: "/check", label: "Health Check" },
    { href: "/compare", label: "Compare" },
    { href: "/hall", label: "Hall of Cone" },
    { href: "/museum", label: "Museum" },
  ],
  validation: [
    { href: "/", label: "Overview" },
    { href: "/certify", label: "Get Certified" },
    { href: "/try", label: "Run Benchmark" },
    { href: "/queue", label: "Validation Queue" },
    { href: "/scorecards", label: "Scorecards" },
    { href: "/feedback", label: "Feedback" },
  ],
  research: [
    { href: "/", label: "Live Search" },
    { href: "/methods", label: "Method" },
    { href: "/research-lab", label: "Research Registry" },
    { href: "/feedback", label: "Feedback" },
  ],
  simulation: [
    { href: "/", label: "Overview" },
    { href: "/platforms", label: "Platforms" },
    { href: "/reports", label: "Reports" },
    { href: "/methodology", label: "Methodology" },
  ],
  refinery: [
    { href: "/", label: "Overview" },
    { href: "/catalog", label: "Catalog" },
    { href: "/contribute", label: "Contribute" },
    { href: "/wiki", label: "Wiki" },
    { href: "/requests", label: "Custom Harvests" },
  ],
  observatory: [
    { href: "/", label: "Runs" },
    { href: "/compare", label: "Compare" },
  ],
};

export function getSiteNav(siteId: string) {
  return SITE_NAV[siteId] ?? [];
}

export function getSiteCircuit(siteId: string) {
  return SITE_CIRCUIT[siteId];
}

/** Alias for clearer call sites */
export const getSiteSurface = getSiteCircuit;

export function getDivisionRelay(id: OrgDivisionId) {
  return DIVISION_RELAY[id];
}

export function stageLabel(stage: string): string {
  return STAGE_RELAY[stage.toLowerCase()] ?? stage;
}

/** Operating loop steps for diagram UI */
export const CIRCUIT_LAPS = [
  "Platform Orchestration identifies a gap, new vertical, or weak production signal",
  "Data Operations ingests, cleans, chunks, and generates training pairs",
  "Research & Development trains, evaluates, and records evidence",
  "R&D submits a candidate to the Validation Queue",
  "Validation & Charter runs certified benchmarks vs commercial baselines",
  "Validation issues a production charter on pass",
  "Production deploys the model, builds the vector index, and serves retrieval",
  "Production and Validation publish metrics back to Orchestration",
  "Orchestration opens data requests → back to Data Operations",
];

export const CIRCUIT_HANDOFFS = [
  { from: "Validation", to: "R&D", text: "pilot failure analysis → recipe revision" },
  { from: "R&D", to: "Data Operations", text: "corpus gaps → prioritized ingest" },
  { from: "Production", to: "Orchestration", text: "serving metrics → weakest-slice report" },
];

/** @deprecated use CIRCUIT_LAPS */
export const OPERATING_LOOP_STEPS = CIRCUIT_LAPS;
