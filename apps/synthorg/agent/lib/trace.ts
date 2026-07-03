/**
 * Map an Eve session onto a synth-core TraceContext (Spec 0006).
 *
 * Eve passes a session projection to every tool's `execute(input, ctx)` (`ctx.session`)
 * and to instrumentation events (`step.started`). `ctx.session.id` is the session id and
 * `ctx.session.parent` — present on delegated subagent sessions — carries `rootSessionId`
 * (the top of the dispatch chain) and `callId` (the parent tool call that spawned this
 * child). This maps that onto a TraceContext so every call in an objective shares one
 * trace id and each delegation becomes a child span.
 *
 * Structural typing (rather than importing Eve's SessionContext directly) keeps this
 * robust across Eve patch versions; the shape mirrors `SessionContext.session`. The
 * session id is the source of truth, not a process-global env var, so concurrent sessions
 * in one process never clobber each other's trace.
 */
import { type TraceContext, startTrace } from "@synthaembed/synth-core";

/** The slice of Eve's `ctx.session` that the trace bridge depends on. */
export interface EveSessionLike {
  readonly id: string;
  readonly parent?: {
    readonly rootSessionId: string;
    readonly callId: string;
  };
}

/**
 * Derive a TraceContext rooted on the Eve session.
 *
 * - `traceId`: the root session id — one trace per objective, shared across the whole
 *   chief -> subagent delegation chain (children inherit `parent.rootSessionId`).
 * - `spanId`: a fresh span per call (borrowed from `startTrace`'s generator), so each
 *   tool invocation records its own span under the shared trace.
 * - `parentSpan`: `parent.callId` on delegated sessions, so a subagent's spans hang under
 *   the delegation that spawned it.
 */
export function traceContextFromSession(session: EveSessionLike, actor: string): TraceContext {
  // startTrace gives us a fresh, well-formed span id; we override the trace id and
  // parent span with the session-derived lineage.
  const base = startTrace(actor);
  const parent = session.parent;
  return {
    traceId: parent ? parent.rootSessionId : session.id,
    spanId: base.spanId,
    parentSpan: parent?.callId,
    actor,
  };
}
