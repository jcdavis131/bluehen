/**
 * The single uniform access layer.
 *
 * Every agent, the `synth` CLI, CI, and the dashboard reach ALL services and databases
 * through one `Synth` client. There is exactly one network chokepoint (core-api), so
 * access is uniform and every call is traced (see trace.ts). Namespaces mirror the model
 * lifecycle: data -> train -> eval -> model, plus vector + ledger + trace.
 */

import {
  type TraceContext,
  toHeaders,
  withSpan,
  setTraceSink,
} from "./trace.ts";

export interface SynthConfig {
  /** core-api base URL; the only endpoint anything talks to. */
  baseUrl: string;
  /** Workspace-scoped API key (one mini-org). */
  apiKey: string;
}

export class Synth {
  private cfg: SynthConfig;
  private ctx: TraceContext;

  constructor(cfg: SynthConfig, ctx: TraceContext) {
    this.cfg = cfg;
    this.ctx = ctx;
    // Route trace spans back through the same uniform endpoint.
    setTraceSink(async (e) => {
      await this.raw("POST", "/v1/trace", e, /*trace*/ false);
    });
  }

  /** Re-bind this client to a child span (used when an agent delegates). */
  withContext(ctx: TraceContext): Synth {
    return new Synth(this.cfg, ctx);
  }

  private async raw(method: string, path: string, body?: unknown, trace = true) {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      authorization: `Bearer ${this.cfg.apiKey}`,
    };
    if (trace) Object.assign(headers, toHeaders(this.ctx));
    const res = await fetch(`${this.cfg.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`);
    return res.status === 204 ? null : res.json();
  }

  private call(target: string, action: string, method: string, path: string, body?: unknown) {
    return withSpan(this.ctx, target, action, () => this.raw(method, path, body));
  }

  // ---- Stage 1: collect ------------------------------------------------------
  data = {
    ingest: (corpusUri: string) => this.call("data", "ingest", "POST", "/v1/data/ingest", { corpusUri }),
    chunk: (docId: string, opts?: { simThreshold?: number }) =>
      this.call("data", "lmar_chunk", "POST", "/v1/data/chunk", { docId, ...opts }),
    synthPairs: (collectionId: string, n = 1000) =>
      this.call("data", "synth_pairs", "POST", "/v1/data/pairs", { collectionId, n }),
  };

  // ---- Stage 2: train / validate --------------------------------------------
  train = {
    launch: (recipe: unknown) => this.call("modal.train", "launch", "POST", "/v1/train/launch", { recipe }),
    status: (jobId: string) => this.call("modal.train", "status", "GET", `/v1/train/${jobId}`),
  };

  // ---- Stage 3: applied test -------------------------------------------------
  evals = {
    run: (modelVersion: string, slice = "rotating") =>
      this.call("eval", "run", "POST", "/v1/eval/run", { modelVersion, slice }),
    gates: (modelVersion: string) => this.call("eval", "gates", "GET", `/v1/eval/${modelVersion}/gates`),
  };

  // ---- Stage 4: real-world use ----------------------------------------------
  model = {
    deploy: (modelVersion: string, opts?: { truncateDims?: number; quant?: "int8" | "binary" | "none" }) =>
      this.call("model", "deploy", "POST", "/v1/model/deploy", { modelVersion, ...opts }),
    list: () => this.call("model", "list", "GET", "/v1/models"),
    embed: (inputs: string[]) => this.call("model.serving", "embed", "POST", "/v1/embed", { inputs }),
  };

  vector = {
    search: (query: string, k = 10) => this.call("neon.vector", "search", "POST", "/v1/search", { query, k }),
  };

  // ---- Governance + observability -------------------------------------------
  ledger = {
    record: (entry: unknown) => this.call("ledger", "record", "POST", "/v1/ledger", entry),
    tail: (limit = 50) => this.call("ledger", "tail", "GET", `/v1/ledger?limit=${limit}`),
    budget: () => this.call("ledger", "budget", "GET", "/v1/budget"),
  };

  trace = {
    /** Replay a whole objective: every span, actor, target, status, timing. */
    view: (traceId: string) => this.call("trace", "view", "GET", `/v1/trace/${traceId}`),
  };
}
