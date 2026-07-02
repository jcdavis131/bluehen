import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fleetJson from "../../../config/fleet.json" with { type: "json" };
import type { FleetConfig, FleetSite, OrgDivisionId } from "./types";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const fleet = fleetJson as FleetConfig;

/** Tenant product sites — each team owns one; not operator/agent shells. */
export const TENANT_SKIP = new Set(["hq", "synthorg", "simulation", "observatory"]);

export interface WorkspaceCredentials {
  siteId: string;
  baseUrl: string;
  apiKey: string;
  /** True when loaded from data/workspaces/{siteId}.env */
  fromWorkspaceFile: boolean;
}

export function listTenantSites(): FleetSite[] {
  return fleet.sites.filter((s) => s.status === "active" && s.domain && !TENANT_SKIP.has(s.id));
}

export function workspaceEnvPath(siteId: string): string {
  return resolve(REPO_ROOT, "data/workspaces", `${siteId}.env`);
}

function parseEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

/** Resolve API base + workspace key for a fleet site (product org). */
export function loadWorkspaceCredentials(siteId: string): WorkspaceCredentials {
  const site = fleet.sites.find((s) => s.id === siteId);
  if (!site) throw new Error(`unknown org/site: ${siteId}`);

  const file = parseEnvFile(workspaceEnvPath(siteId));
  const baseUrl =
    file.SYNTH_API_BASE_URL ??
    process.env.SYNTH_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:8000";
  const apiKey = file.SYNTH_API_KEY ?? process.env.SYNTH_API_KEY ?? "";

  return {
    siteId,
    baseUrl,
    apiKey,
    fromWorkspaceFile: Boolean(file.SYNTH_API_KEY),
  };
}

/** Active org from SYNTH_ORG env or explicit siteId flag. */
export function resolveOrg(siteId?: string): WorkspaceCredentials | null {
  const id = siteId ?? process.env.SYNTH_ORG;
  if (!id) return null;
  return loadWorkspaceCredentials(id);
}

export function formatHandoffNote(from: OrgDivisionId, to: OrgDivisionId, detail: string): string {
  return `handoff ${from}→${to}: ${detail}`;
}
