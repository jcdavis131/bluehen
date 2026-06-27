/**
 * Bind every tool in this agent to the unified access layer.
 *
 * All service/db access in this app goes through the Synth client, so each agent's calls
 * are uniform and land in the same trace store as the `synth` CLI and the Python pipeline.
 *
 * Trace propagation: if the eve session maps its session id into SYNTH_TRACE_ID (see
 * channels / deployment notes), every tool call in a session shares one trace and each
 * delegation becomes a child span. Until that hook is wired, a per-process trace is used.
 */
import { synthFromEnv } from "@synthaembed/synth-core";

export function synthFor(actor: string) {
  return synthFromEnv(actor);
}
