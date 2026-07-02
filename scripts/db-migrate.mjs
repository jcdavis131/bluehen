#!/usr/bin/env node
/**
 * Run Alembic migrations with repo-root .env loaded and a connectivity preflight.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ENV_PATH = resolve(ROOT, ".env");

function loadEnv() {
  if (!existsSync(ENV_PATH)) return;
  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

loadEnv();

const dbUrl =
  process.env.DATABASE_URL ??
  "postgresql+psycopg://synth:synth@localhost:5433/synthaembed";

const preflight = spawnSync(
  "uv",
  ["run", "python", resolve(ROOT, "scripts/db-preflight.py")],
  {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: dbUrl },
    encoding: "utf8",
  },
);

if (preflight.status !== 0) {
  console.error("Postgres preflight failed — cannot reach DATABASE_URL from the host.");
  console.error(preflight.stderr || preflight.stdout);
  console.error("\nFix:");
  console.error("  1. pnpm dev:stack");
  console.error("  2. docker exec infra-postgres-1 pg_isready -U synth -d synthaembed");
  console.error("  3. If host still times out, restart Docker Desktop (Windows port publish issue).");
  process.exit(1);
}

const migrate = spawnSync("uv", ["run", "alembic", "upgrade", "head"], {
  cwd: resolve(ROOT, "services/core-api"),
  env: { ...process.env, DATABASE_URL: dbUrl },
  stdio: "inherit",
});

process.exit(migrate.status ?? 1);
