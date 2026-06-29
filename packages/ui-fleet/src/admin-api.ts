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
