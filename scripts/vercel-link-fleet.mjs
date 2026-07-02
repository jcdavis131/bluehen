#!/usr/bin/env node
/**
 * Multi-project Vercel linking for fleet sites (ADR-001 #6).
 *
 * Usage:
 *   node scripts/vercel-link-fleet.mjs           # print commands (dry run)
 *   node scripts/vercel-link-fleet.mjs --execute  # run vercel link per site
 *
 * Requires: vercel CLI authenticated (`vercel whoami`)
 * Set VERCEL_SCOPE to override config/fleet.json platform.vercel.scope
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const EXECUTE = process.argv.includes("--execute");

const fleet = JSON.parse(readFileSync(resolve(ROOT, "config/fleet.json"), "utf8"));
const vercelCfg = fleet.platform.vercel ?? {};
const scope = process.env.VERCEL_SCOPE ?? vercelCfg.scope;
const siteProjects = { ...(vercelCfg.siteProjects ?? {}), ...(vercelCfg.createProjects ?? {}) };

const DEPLOYABLE = fleet.sites.filter(
  (s) => s.status === "active" && s.domain && s.appPath?.startsWith("apps/"),
);

function runVercel(args, cwd) {
  const r = spawnSync("vercel", args, { cwd, stdio: "inherit", shell: true });
  return r.status === 0;
}

function projectExists(name) {
  const r = spawnSync("vercel", ["project", "inspect", name, "--scope", scope], {
    cwd: ROOT,
    stdio: "pipe",
    shell: true,
  });
  return r.status === 0;
}

function ensureProject(name) {
  if (projectExists(name)) return true;
  if (!EXECUTE) {
    console.log(`vercel projects add ${name} --scope ${scope}`);
    return false;
  }
  console.log(`\n→ Creating Vercel project ${name}…`);
  return runVercel(["projects", "add", name, "--scope", scope], ROOT);
}

console.log(`Vercel fleet link · scope: ${scope ?? "(set VERCEL_SCOPE)"}\n`);

for (const site of DEPLOYABLE) {
  const appRoot = resolve(ROOT, site.appPath);
  const linkFile = resolve(appRoot, ".vercel/project.json");
  let project = siteProjects[site.id];

  if (!project) {
    console.log(`# ${site.id} (${site.domain}) — add project to config/fleet.json platform.vercel`);
    continue;
  }

  const cmd = `cd ${site.appPath} && vercel link --yes --scope ${scope} --project ${project}`;

  if (existsSync(linkFile)) {
    console.log(`✓ ${site.id}: already linked (${site.appPath}/.vercel/project.json)`);
    continue;
  }

  if (!EXECUTE) {
    console.log(cmd);
    if (!projectExists(project)) ensureProject(project);
    continue;
  }

  if (!scope || !project) {
    console.error(`Skip ${site.id}: missing scope or project name`);
    continue;
  }

  if (!ensureProject(project)) {
    console.error(`✗ ${site.id}: could not create project ${project}`);
    continue;
  }

  console.log(`\n→ Linking ${site.id} → ${project}…`);
  const ok = runVercel(["link", "--yes", "--scope", scope, "--project", project], appRoot);
  console.log(ok ? `✓ ${site.id} linked` : `✗ ${site.id} failed`);
}

if (!EXECUTE) {
  console.log("\nRun with --execute to apply.");
  console.log("\nSet Root Directory in each Vercel project (Dashboard → Settings → General):");
  for (const site of DEPLOYABLE) {
    const project = siteProjects[site.id];
    if (project) console.log(`  ${project} → ${site.appPath}`);
  }
  console.log("\nAfter core-api prod URL: pnpm bootstrap:orgs, then pnpm vercel:env-fleet:exec");
}
