/**
 * Uniform tracing for every agent <-> service <-> db exchange.
 *
 * One trace spans an objective (e.g. "improve finance retrieval"); each delegated
 * action is a span with a parent, an actor (which agent/human/CLI), and a target
 * (which service/db). Spans are propagated across process and language boundaries via
 * the headers below, so a TS agent tool, the `synth` CLI, and a Python Modal function
 * all attach to the same trace. Every span is recorded to the append-only trace store
 * (core-api `/v1/trace`) so conversations and handoffs are fully replayable.
 */

export const TRACE_HEADERS = {
  trace: "x-synth-trace-id",
  span: "x-synth-span-id",
  parent: "x-synth-parent-span",
  actor: "x-synth-actor", // e.g. "chief_of_staff", "training_orchestrator", "cli", "operator"
} as const;

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpan?: string;
  actor: string;
}

const rid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

/** Start a new trace (a whole objective). */
export function startTrace(actor: string): TraceContext {
  return { traceId: rid("tr"), spanId: rid("sp"), actor };
}

/** Derive a child span for one action under an existing trace. */
export function childSpan(ctx: TraceContext, actor = ctx.actor): TraceContext {
  return { traceId: ctx.traceId, spanId: rid("sp"), parentSpan: ctx.spanId, actor };
}

/** Reconstruct a context from inbound headers (server / Python boundary). */
export function fromHeaders(h: Record<string, string | undefined>): TraceContext | null {
  const traceId = h[TRACE_HEADERS.trace];
  const spanId = h[TRACE_HEADERS.span];
  if (!traceId || !spanId) return null;
  return { traceId, spanId, parentSpan: h[TRACE_HEADERS.parent], actor: h[TRACE_HEADERS.actor] ?? "unknown" };
}

/** Serialize a context to outbound headers. */
export function toHeaders(ctx: TraceContext): Record<string, string> {
  const out: Record<string, string> = {
    [TRACE_HEADERS.trace]: ctx.traceId,
    [TRACE_HEADERS.span]: ctx.spanId,
    [TRACE_HEADERS.actor]: ctx.actor,
  };
  if (ctx.parentSpan) out[TRACE_HEADERS.parent] = ctx.parentSpan;
  return out;
}

export interface SpanEvent {
  ctx: TraceContext;
  target: string; // service/db touched, e.g. "modal.train", "neon.documents", "ledger"
  action: string;
  status: "ok" | "error";
  durationMs: number;
  detail?: unknown;
}

/** Sink that persists spans. Wired by the client to POST core-api /v1/trace. */
export type TraceSink = (e: SpanEvent) => void | Promise<void>;
let sink: TraceSink = (e) => console.error(`[trace] ${e.ctx.traceId} ${e.ctx.actor} -> ${e.target}.${e.action} ${e.status} ${e.durationMs}ms`);
export function setTraceSink(s: TraceSink) { sink = s; }

/** Wrap any service/db call so it is timed, traced, and recorded uniformly. */
export async function withSpan<T>(
  ctx: TraceContext,
  target: string,
  action: string,
  fn: () => Promise<T>,
): Promise<T> {
  const t0 = Date.now();
  try {
    const result = await fn();
    await sink({ ctx, target, action, status: "ok", durationMs: Date.now() - t0, detail: undefined });
    return result;
  } catch (err) {
    await sink({ ctx, target, action, status: "error", durationMs: Date.now() - t0, detail: String(err) });
    throw err;
  }
}
