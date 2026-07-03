import fleetJson from "../../../config/fleet.json" with { type: "json" };
import type { FleetConfig, FleetSite, OrgDivisionId, SitePhase, SiteStatus, SiteVenture } from "./types";

export type { FleetConfig, FleetSite, OrgDivisionId, SitePhase, SiteStatus, SiteVenture };
export type { BdQueue, BdQueueCandidate } from "./bd-queue";
export type { OrgDivision, OrgDivisionsConfig } from "./org-divisions";
export { getBdQueue, getBdQueueForSite } from "./bd-queue";
export {
  getClosedLoopSteps,
  getLedgerStages,
  getOrgDivision,
  getOrgDivisionsConfig,
  ledgerStageToDivision,
  listOrgDivisions,
  LOOP_ORDER,
} from "./org-divisions";
export {
  BRAND,
  CIRCUIT_HANDOFFS,
  CIRCUIT_LAPS,
  DIVISION_RELAY,
  getDivisionRelay,
  getSiteCircuit,
  getSiteSurface,
  getSiteNav,
  GLOSSARY,
  OPERATING_LOOP_STEPS,
  RE,
  SITE_CIRCUIT,
  SITE_NAV,
  stageLabel,
} from "./narrative";

const fleet = fleetJson as FleetConfig;

export function getFleet(): FleetConfig {
  return fleet;
}

export function getPlatform() {
  return fleet.platform;
}

export function listSites(filter?: { status?: SiteStatus; phase?: SitePhase }): FleetSite[] {
  return fleet.sites.filter((s) => {
    if (filter?.status && s.status !== filter.status) return false;
    if (filter?.phase && s.phase !== filter.phase && s.phase !== "all" && filter.phase !== "all") return false;
    return true;
  });
}

export function getSite(id: string): FleetSite | undefined {
  return fleet.sites.find((s) => s.id === id);
}

export function getSiteByDomain(domain: string): FleetSite | undefined {
  const d = domain.toLowerCase().replace(/^www\./, "");
  return fleet.sites.find((s) => s.domain?.toLowerCase() === d);
}

/** Dev command for a site, e.g. pnpm --filter @synthaembed/hub dev */
export function devCommand(site: FleetSite): string | null {
  if (!site.port) return null;
  return `pnpm --filter ${site.package} dev`;
}

/** Markdown context block for Cursor / Eve pair-programming across the fleet. */
export function pairProgramContext(focusSiteId?: string): string {
  const p = fleet.platform;
  const lines: string[] = [
    `# ${p.name} — Fleet pair-programming context`,
    "",
    `**${p.tagline}** · codename \`${p.codename}\` · repo ${p.repo}`,
    "",
    "## Orchestration chokepoints (always use these)",
    `- **Agent:** \`${p.agentApp}\` (Eve Chief of Staff)`,
    `- **Control plane:** \`${p.controlApp}\` → jcamd.com`,
    `- **API:** \`${p.coreApi}\` via \`@synthaembed/synth-core\` only — no direct service/db calls`,
    `- **Fleet registry:** \`config/fleet.json\` + \`@synthaembed/fleet\``,
    "",
    "## Site fleet",
    "",
    "| id | domain | appPath | package | port | status |",
    "|---|---|---|---|---|---|",
  ];

  for (const s of fleet.sites) {
    if (s.role === "fleet-agent") continue;
    lines.push(
      `| ${s.id} | ${s.domain ?? "—"} | \`${s.appPath}\` | ${s.package} | ${s.port ?? "—"} | ${s.status} |`,
    );
  }

  lines.push("", "## Local dev (common)", "```bash", "pnpm install", "uv sync");

  const api = `uv run uvicorn app.main:app --app-dir ${p.coreApi}  # :8000`;
  lines.push(api);

  for (const s of fleet.sites) {
    const cmd = devCommand(s);
    if (cmd && s.status === "active") lines.push(cmd + `  # :${s.port}`);
  }

  lines.push("```", "");

  if (focusSiteId) {
    const focus = getSite(focusSiteId);
    if (focus) {
      lines.push(`## Focus site: ${focus.name} (\`${focus.id}\`)`, "", focus.description, "", `- Path: \`${focus.appPath}\``);
      if (focus.domain) lines.push(`- Domain: ${focus.domain}`);
      if (focus.legacyRepo) lines.push(`- Migrate from legacy repo: ${focus.legacyRepo}`);
      lines.push("");
    }
  }

  lines.push(
    "## Agent rules",
    "- Cross-site changes: update `config/fleet.json` if adding/moving a site.",
    "- Every tenant site gets its own `SYNTH_API_KEY` (workspace) in Vercel env.",
    "- Spec-driven: trace code to `specs/`; ML changes need eval gates.",
  );

  return lines.join("\n");
}
