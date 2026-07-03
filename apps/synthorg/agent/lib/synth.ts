/**
 * Bind every tool in this agent to the unified access layer.
 *
 * All service/db access in this app goes through the Synth client, so each agent's calls
 * are uniform and land in the same trace store as the `synth` CLI and the Python pipeline.
 *
 * Trace propagation: pass the Eve session projection (`ctx.session`, from a tool's
 * `execute(input, ctx)`) so every tool call in a session shares one trace rooted on the
 * session id, and each subagent delegation becomes a child span (see ./trace.ts). Without
 * a session (CLI, tests, scripts), a per-process trace is used.
 */
import { synthFromEnv, startTrace, type TraceContext } from "@synthaembed/synth-core";
import { traceContextFromSession, type EveSessionLike } from "./trace.js";

export function synthFor(actor: string, session?: EveSessionLike) {
  const ctx: TraceContext = session ? traceContextFromSession(session, actor) : startTrace(actor);
  return synthFromEnv(actor, ctx);
}
