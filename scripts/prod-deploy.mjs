#!/usr/bin/env node
/**
 * Phase A production stack orchestrator (ADR-002).
 *
 * Chains Railway + Neon migrate + workspace bootstrap + Vercel fleet env.
 *
 * Usage:
 *   node scripts/prod-deploy.mjs                    # full checklist (dry run)
 *   node scripts/prod-deploy.mjs --step secrets     # generate data/deploy/railway.env
 *   node scripts/prod-deploy.mjs --step migrate     # Alembic against Neon
 *   node scripts/prod-deploy.mjs --step railway     # Railway login + deploy core-api
 *   node scripts/prod-deploy.mjs --step bootstrap   # workspaces against prod API
 *   node scripts/prod-deploy.mjs --step vercel      # link + push env to fleet
 *   node scripts/prod-deploy.mjs --step smoke       # curl healthz + readyz
 *   node scripts/prod-deploy.mjs --step all --execute
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DEPLOY_ENV = resolve(ROOT, "data", "deploy", "railway.env");

const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");
const stepIdx = args.indexOf("--step");
const step = stepIdx >= 0 ? args[stepIdx + 1] : "checklist";

function loadDeployEnv() {
  if (!existsSync(DEPLOY_ENV)) return;
  for (const line of readFileSync(DEPLOY_ENV, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

function runNode(script, extra = []) {
  const r = spawnSync("node", [resolve(ROOT, "scripts", script), ...extra], {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  return r.status === 0;
}

function runUv(args) {
  const r = spawnSync("uv", args, { cwd: ROOT, stdio: "inherit", shell: true, env: process.env });
  return r.status === 0;
}

function curl(url) {
  const r = spawnSync("curl", ["-sS", "-w", "\n%{http_code}", url], {
    cwd: ROOT,
    stdio: "pipe",
    shell: true,
    encoding: "utf8",
  });
  const lines = (r.stdout || "").trim().split("\n");
  const code = lines.pop() ?? "000";
  return { ok: r.status === 0 && code.startsWith("2"), body: lines.join("\n"), code };
}

loadDeployEnv();

const apiBase = process.env.SYNTH_API_BASE_URL ?? "";

const steps = {
  secrets() {
    return runNode("railway-deploy.mjs");
  },
  migrate() {
    return runNode("railway-deploy.mjs", ["--migrate"]);
  },
  railway() {
    if (!EXECUTE) {
      console.log("Dry run: node scripts/railway-deploy.mjs --execute");
      return true;
    }
    return runNode("railway-deploy.mjs", ["--execute"]);
  },
  bootstrap() {
    if (!apiBase) {
      console.error("Set SYNTH_API_BASE_URL in data/deploy/railway.env first.");
      return false;
    }
    if (!EXECUTE) {
      console.log(`Dry run: SYNTH_API_BASE_URL=${apiBase} uv run python scripts/bootstrap_orgs.py`);
      return true;
    }
    return runUv(["run", "python", "scripts/bootstrap_orgs.py"]);
  },
  vercel() {
    const linkArgs = EXECUTE ? ["--execute"] : [];
    if (!runNode("vercel-link-fleet.mjs", linkArgs)) return false;
    if (!EXECUTE) return runNode("vercel-env-fleet.mjs");
    if (!apiBase) {
      console.error("Set SYNTH_API_BASE_URL before vercel env push.");
      return false;
    }
    return runNode("vercel-env-fleet.mjs", ["--execute"]);
  },
  smoke() {
    if (!apiBase) {
      console.error("Set SYNTH_API_BASE_URL for smoke test.");
      return false;
    }
    const hz = curl(`${apiBase.replace(/\/$/, "")}/healthz`);
    console.log(`GET /healthz → ${hz.code}\n${hz.body}`);
    const rz = curl(`${apiBase.replace(/\/$/, "")}/readyz`);
    console.log(`GET /readyz → ${rz.code}\n${rz.body}`);
    return hz.ok && rz.ok;
  },
  checklist() {
    console.log(`
Phase A production stack (INF-003 → INF-005)
============================================

Prerequisites (Operator):
  1. Neon project + DATABASE_URL in data/deploy/railway.env
  2. Railway account linked to GitHub repo
  3. Vercel CLI logged in (vercel whoami)

Steps:
  node scripts/prod-deploy.mjs --step secrets
  # Edit data/deploy/railway.env → DATABASE_URL, then after Railway URL:
  node scripts/prod-deploy.mjs --step migrate --execute
  node scripts/prod-deploy.mjs --step railway --execute
  # Railway dashboard: add worker service (start: worker), shared env, volume /data/artifacts
  node scripts/prod-deploy.mjs --step bootstrap --execute
  node scripts/prod-deploy.mjs --step vercel --execute
  node scripts/prod-deploy.mjs --step smoke

Or: node scripts/prod-deploy.mjs --step all --execute

Docs: infra/railway.md · ADR-002
`);
    return true;
  },
  all() {
    const order = ["secrets", "migrate", "railway", "bootstrap", "vercel", "smoke"];
    for (const name of order) {
      console.log(`\n── ${name} ──`);
      if (!steps[name]()) {
        console.error(`\nStopped at step: ${name}`);
        return false;
      }
      if (name === "railway" && EXECUTE) {
        console.log("\nPause: add worker service in Railway dashboard, set SYNTH_API_BASE_URL, then re-run from bootstrap.");
        return true;
      }
    }
    return true;
  },
};

const fn = steps[step];
if (!fn) {
  console.error(`Unknown step: ${step}. Use: ${Object.keys(steps).join(", ")}`);
  process.exit(1);
}

process.exit(fn() ? 0 : 1);
