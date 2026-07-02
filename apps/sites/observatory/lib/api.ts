import type { EventRow, MetricRow, RunManifest } from "./types";

/** Telemetry source: the runboard dev server locally, core-api in production
 * (same read-only contract — see knowledge/platform/core-api-telemetry.md). */
const BASE =
  process.env.NEXT_PUBLIC_TELEMETRY_URL ?? "http://localhost:8100";

const KEY = process.env.NEXT_PUBLIC_TELEMETRY_KEY;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    headers: KEY ? { Authorization: `Bearer ${KEY}` } : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}`);
  return (await res.json()) as T;
}

export async function listRuns(): Promise<RunManifest[]> {
  const out = await get<{ runs: RunManifest[] }>("/v1/runs");
  return out.runs;
}

export async function getRun(runId: string): Promise<RunManifest> {
  return get<RunManifest>(`/v1/runs/${encodeURIComponent(runId)}`);
}

export async function getMetrics(
  runId: string,
  after = 0,
): Promise<MetricRow[]> {
  const out = await get<{ rows: MetricRow[] }>(
    `/v1/runs/${encodeURIComponent(runId)}/metrics?after=${after}`,
  );
  return out.rows;
}

export async function getEvents(
  runId: string,
  after = 0,
): Promise<EventRow[]> {
  const out = await get<{ rows: EventRow[] }>(
    `/v1/runs/${encodeURIComponent(runId)}/events?after=${after}`,
  );
  return out.rows;
}
