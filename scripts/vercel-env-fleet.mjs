#!/usr/bin/env node
/**
 * Push fleet workspace env vars to Vercel projects (ADR-002 §5).
 *
 * Reads data/workspaces/{siteId}.env from bootstrap:orgs, then sets production env
 * on each linked Vercel project from config/fleet.json.
 *
 * Usage:
 *   node scripts/vercel-env-fleet.mjs              # dry run
 *   node scripts/vercel-env-fleet.mjs --execute    # apply
 *   SYNTH_API_BASE_URL=https://… node scripts/vercel-env-fleet.mjs --execute
 *
 * Requires: vercel CLI (`vercel whoami`), workspace env files from bootstrap:orgs.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const EXECUTE = process.argv.includes("--execute");

const fleet = JSON.parse(readFileSync(resolve(ROOT, "config/fleet.json"), "utf8"));
const vercel = fleet.platform.vercel ?? {};
const scope = process.env.VERCEL_SCOPE ?? vercel.scope;
const siteProjects = { ...vercel.siteProjects, ...vercel.createProjects };

function parseEnvFile(path) {
  const out = {};
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

function vercelEnvAdd(name, value, cwd) {
  if (!EXECUTE) {
    console.log(`  vercel env add ${name} production  # ${value.slice(0, 12)}…`);
    return true;
  }
  const r = spawnSync("vercel", ["env", "add", name, "production"], {
    cwd,
    input: value,
    encoding: "utf8",
    shell: true,
  });
  if (r.status !== 0 && !String(r.stderr || "").includes("already exists")) {
    console.error(`  ✗ ${name}: ${r.stderr || r.stdout}`);
    return false;
  }
  console.log(`  ✓ ${name}`);
  return true;
}

function setSiteEnv(site, vars) {
  const project = siteProjects[site.id];
  if (!project) {
    console.log(`# skip ${site.id}: no Vercel project mapped`);
    return;
  }
  const appRoot = resolve(ROOT, site.appPath);
  const linkFile = resolve(appRoot, ".vercel/project.json");
  console.log(`\n${site.id} → ${project} (${site.domain ?? "no domain"})`);
  if (!existsSync(linkFile)) {
    console.log(`  ! not linked — run: pnpm vercel:link-fleet:exec`);
    return;
  }
  for (const [name, value] of Object.entries(vars)) {
    if (!value) continue;
    vercelEnvAdd(name, value, appRoot);
  }
}

const apiBase =
  process.env.SYNTH_API_BASE_URL ??
  process.env.RAILWAY_PUBLIC_DOMAIN ??
  "";

console.log(`Vercel fleet env · scope: ${scope ?? "(set VERCEL_SCOPE)"}`);
console.log(`API base: ${apiBase || "(set SYNTH_API_BASE_URL after Railway deploy)"}\n`);

if (!apiBase && EXECUTE) {
  console.error("Set SYNTH_API_BASE_URL to your Railway core-api HTTPS URL first.");
  process.exit(1);
}

const sharedApi = {
  SYNTH_API_BASE_URL: apiBase,
  NEXT_PUBLIC_API_BASE_URL: apiBase,
  NEXT_PUBLIC_FLEET_LOCAL: "0",
};

for (const site of fleet.sites) {
  if (site.status !== "active" || !site.appPath?.startsWith("apps/")) continue;

  if (site.id === "hq") {
    const admin = process.env.API_SECRET_KEY ?? "";
    setSiteEnv(site, {
      ...sharedApi,
      API_SECRET_KEY: admin,
      SYNTH_ADMIN_KEY: admin,
    });
    continue;
  }

  if (!site.domain) continue;
  const ws = parseEnvFile(resolve(ROOT, "data/workspaces", `${site.id}.env`));
  setSiteEnv(site, {
    ...sharedApi,
    SYNTH_API_KEY: ws.SYNTH_API_KEY ?? "",
  });
}

if (!EXECUTE) {
  console.log("\nDry run. Run with --execute after Railway URL + bootstrap:orgs.");
  console.log("Example:");
  console.log(
    '  $env:SYNTH_API_BASE_URL="https://core-api-production.up.railway.app"; $env:API_SECRET_KEY="…"; pnpm vercel:env-fleet:exec',
  );
}
