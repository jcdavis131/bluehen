/**
 * Operator admin API — uses API_SECRET_KEY, never exposed to the browser directly.
 */

function adminConfig() {
  const baseUrl =
    process.env.SYNTH_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  const adminKey = process.env.API_SECRET_KEY ?? process.env.SYNTH_ADMIN_KEY ?? "";
  return { baseUrl, adminKey };
}

async function adminFetch(path: string, init?: RequestInit) {
  const { baseUrl, adminKey } = adminConfig();
  if (!adminKey) {
    throw new Error("API_SECRET_KEY not set on Operations Center");
  }
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${adminKey}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`${init?.method ?? "GET"} ${path} -> ${res.status}: ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

export async function adminHillClimb(siteId: string, corpusUri = "corpus.jsonl") {
  return adminFetch("/v1/admin/hill-climb", {
    method: "POST",
    body: JSON.stringify({ siteId, corpusUri }),
  });
}

export async function adminBdQueue() {
  return adminFetch("/v1/admin/bd/queue");
}

export async function adminIssueCharter(input: {
  siteId: string;
  modelVersion: string;
  recipe: Record<string, unknown>;
  candidateId?: string;
  issuedBy?: string;
}) {
  return adminFetch("/v1/admin/bd/charter", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function adminDeploy(input: {
  siteId: string;
  modelVersion: string;
  truncateDims?: number;
  quant?: string;
}) {
  return adminFetch("/v1/admin/deploy", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function adminRecordScorecard(input: {
  siteId: string;
  candidateId: string;
  passed: boolean;
  notes?: string;
}) {
  return adminFetch("/v1/admin/bd/scorecard", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function adminDatalabSources() {
  return adminFetch("/v1/admin/datalab/sources");
}

export async function adminHarvest(sourceId: string) {
  return adminFetch("/v1/admin/datalab/harvest", {
    method: "POST",
    body: JSON.stringify({ sourceId }),
  });
}

export async function adminSubmissions(status = "pending") {
  return adminFetch(`/v1/admin/refinery/submissions?status=${encodeURIComponent(status)}`);
}

export async function adminReviewSubmission(id: string, action: "approve" | "reject") {
  return adminFetch(`/v1/admin/refinery/submissions/${id}/review`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

export async function adminCatalogSync() {
  return adminFetch("/v1/admin/catalog/sync", { method: "POST", body: "{}" });
}

export async function adminUsage(days = 31) {
  return adminFetch(`/v1/admin/usage?days=${days}`);
}

export type ExhaustSummary = {
  sinceDays: number;
  events: { key: string; count: number }[];
};

/** Funnel counts by source+event (PMF-003 dogfood). */
export async function adminExhaustSummary(days = 31): Promise<ExhaustSummary> {
  return adminFetch(`/v1/admin/exhaust/summary?days=${days}`) as Promise<ExhaustSummary>;
}
