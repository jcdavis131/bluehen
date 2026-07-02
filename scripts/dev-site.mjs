#!/usr/bin/env node
/**
 * Run a fleet site dev server with workspace env from data/workspaces/{siteId}.env
 *
 * Usage: node scripts/dev-site.mjs hub
 *        pnpm dev:site research-rag
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const SITE_PACKAGES = {
  hub: "@synthaembed/storefront",
  control: "@synthaembed/hq",
  dumbmodel: "@synthaembed/dumbmodel",
  "validation": "@synthaembed/validation",
  "research": "@synthaembed/research",
  "simulation": "@synthaembed/simulation",
};

const siteId = process.argv[2];
if (!siteId || !SITE_PACKAGES[siteId]) {
  console.error(`Usage: pnpm dev:site <${Object.keys(SITE_PACKAGES).join("|")}>`);
  process.exit(1);
}

const envPath = resolve(ROOT, "data/workspaces", `${siteId}.env`);
const env = { ...process.env, NEXT_PUBLIC_FLEET_LOCAL: "1" };

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  console.log(`Loaded ${envPath}`);
} else {
  console.warn(`No ${envPath} — run: pnpm bootstrap:orgs`);
  console.warn("Sites will show offline until SYNTH_API_KEY is set.");
}

const child = spawn(
  "npx",
  ["pnpm@9.12.0", "--filter", SITE_PACKAGES[siteId], "dev"],
  { cwd: ROOT, env, stdio: "inherit", shell: true },
);

child.on("exit", (code) => process.exit(code ?? 0));
