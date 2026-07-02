/**
 * Server-side core-api helpers for fleet site route handlers.
 * Keys stay on the server — client components call /api/* only.
 */

export type SearchHit = {
  id: string;
  score: number;
  payload: { text?: string; title?: string; [key: string]: unknown };
};

export type SearchResult = {
  query: string;
  hits: SearchHit[];
  modelVersion?: string;
  backend?: string;
  tier?: { truncateDims?: number | null; quant?: string | null; label?: string };
};

export type SearchOptions = {
  k?: number;
  truncateDims?: number;
  quant?: "int8";
};

function apiConfig() {
  const baseUrl =
    process.env.SYNTH_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  const apiKey = process.env.SYNTH_API_KEY ?? "";
  return { baseUrl, apiKey };
}

async function apiFetch(path: string, init?: RequestInit) {
  const { baseUrl, apiKey } = apiConfig();
  if (!apiKey) {
    throw new Error("SYNTH_API_KEY not set — run pnpm bootstrap:orgs then pnpm dev:site <siteId>");
  }
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`${init?.method ?? "GET"} ${path} -> ${res.status}: ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

export async function siteHealth(): Promise<boolean> {
  const { baseUrl } = apiConfig();
  try {
    const res = await fetch(`${baseUrl}/healthz`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function siteSearch(query: string, k = 8, opts?: SearchOptions): Promise<SearchResult> {
  const body: Record<string, unknown> = { query, k };
  if (opts?.truncateDims != null) body.truncateDims = opts.truncateDims;
  if (opts?.quant) body.quant = opts.quant;
  return apiFetch("/v1/search", {
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<SearchResult>;
}

export async function siteModels() {
  return apiFetch("/v1/models");
}

export type DiagnoseResult = {
  samples: number;
  dims: number;
  effectiveRank: number;
  maxPossibleRank: number;
  utilization: number;
  meanPairwiseSimilarity: number;
  modelVersion: string;
  consentStored: boolean;
};

/** Embedding health check (Spec 0015) — measured diagnostics on a
 * user-submitted text sample; consent gates datalab-inbox storage. */
export async function siteDiagnose(texts: string[], consent: boolean): Promise<DiagnoseResult> {
  return apiFetch("/v1/diagnose", {
    method: "POST",
    body: JSON.stringify({ texts, consent }),
  }) as Promise<DiagnoseResult>;
}

export async function siteBudget() {
  return apiFetch("/v1/budget");
}

export async function siteLedger(limit = 20) {
  return apiFetch(`/v1/ledger?limit=${limit}`);
}

export type FeedbackInput = {
  siteId: string;
  division?: string;
  rating: "up" | "down" | "neutral";
  query?: string;
  comment: string;
  context?: Record<string, unknown>;
};

/** Operator feedback → ledger for hill-climb routing (Spec 0012). */
export async function siteFeedback(input: FeedbackInput) {
  const note = [
    `[${input.rating}] ${input.comment}`,
    input.query ? `query: ${input.query.slice(0, 200)}` : null,
    input.division ? `division: ${input.division}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return apiFetch("/v1/ledger", {
    method: "POST",
    body: JSON.stringify({
      stage: "feedback",
      siteId: input.siteId,
      notes: note,
      rating: input.rating,
      comment: input.comment,
      query: input.query,
      division: input.division,
      context: input.context,
    }),
  });
}

export async function siteBdQueue() {
  return apiFetch("/v1/bd/queue");
}

export async function siteHillClimb(corpusUri = "corpus.jsonl") {
  return apiFetch("/v1/research/hill-climb", {
    method: "POST",
    body: JSON.stringify({ corpusUri }),
  });
}
