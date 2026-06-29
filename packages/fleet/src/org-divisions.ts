import orgJson from "../../../config/org-divisions.json" with { type: "json" };
import type { OrgDivisionId } from "./types";

export interface OrgDivision {
  id: OrgDivisionId;
  name: string;
  codename: string;
  mission: string;
  owner: string;
  primarySystems: string[];
  publicSites: string[];
  owns: string[];
  doesNotOwn: string[];
  deliversTo: OrgDivisionId[];
  expectsFrom: Record<string, string[]>;
  delivers: Record<string, string[]>;
  sla?: Record<string, string>;
}

export interface OrgDivisionsConfig {
  version: number;
  description: string;
  divisions: OrgDivision[];
  closedLoop: {
    steps: string[];
    ledgerStages: string[];
  };
}

const config = orgJson as unknown as OrgDivisionsConfig;

/** Primary loop order for diagram layout (Spec 0012). */
export const LOOP_ORDER: OrgDivisionId[] = [
  "orchestration",
  "data",
  "research",
  "bd",
  "execution",
];

const STAGE_DIVISION: Record<string, OrgDivisionId> = {
  collect: "data",
  chunk: "data",
  pairs: "data",
  train: "research",
  eval: "research",
  pilot: "bd",
  charter: "bd",
  deploy: "execution",
  index: "execution",
};

export function getOrgDivisionsConfig(): OrgDivisionsConfig {
  return config;
}

export function listOrgDivisions(): OrgDivision[] {
  return config.divisions;
}

export function getOrgDivision(id: OrgDivisionId): OrgDivision | undefined {
  return config.divisions.find((d) => d.id === id);
}

export function getClosedLoopSteps(): string[] {
  return config.closedLoop.steps;
}

export function getLedgerStages(): string[] {
  return config.closedLoop.ledgerStages;
}

/** Map a ledger stage string to the owning division (Spec 0012 §8). */
export function ledgerStageToDivision(stage: string): OrgDivisionId | null {
  return STAGE_DIVISION[stage.toLowerCase()] ?? null;
}
