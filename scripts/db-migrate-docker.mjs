#!/usr/bin/env node
/**
 * Run Alembic migrations inside the Docker network (Windows fallback when host
 * port publish is flaky). Requires infra-postgres-1 running.
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const dbUrl = "postgresql+psycopg://synth:synth@postgres:5432/synthaembed";

const preflight = spawnSync(
  "docker",
  [
    "run",
    "--rm",
    "--network",
    "infra_default",
    "pgvector/pgvector:pg16",
    "pg_isready",
    "-h",
    "postgres",
    "-U",
    "synth",
    "-d",
    "synthaembed",
  ],
  { encoding: "utf8" },
);

if (preflight.status !== 0) {
  console.error("Docker network preflight failed — is `pnpm dev:stack` running?");
  console.error(preflight.stderr || preflight.stdout);
  process.exit(1);
}

const migrate = spawnSync(
  "docker",
  [
    "run",
    "--rm",
    "-v",
    `${ROOT}/services/core-api:/app`,
    "-w",
    "/app",
    "--network",
    "infra_default",
    "-e",
    `DATABASE_URL=${dbUrl}`,
    "python:3.12-slim",
    "bash",
    "-lc",
    "pip install -q alembic psycopg sqlalchemy pgvector && alembic upgrade head",
  ],
  { stdio: "inherit" },
);

process.exit(migrate.status ?? 1);
