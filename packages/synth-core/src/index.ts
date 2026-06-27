export { Synth, type SynthConfig } from "./client.ts";
export {
  TRACE_HEADERS,
  type TraceContext,
  type SpanEvent,
  type TraceSink,
  startTrace,
  childSpan,
  fromHeaders,
  toHeaders,
  withSpan,
  setTraceSink,
} from "./trace.ts";

/** Convenience: build a Synth client from env + a fresh or inherited trace. */
import { Synth } from "./client.ts";
import { startTrace, type TraceContext } from "./trace.ts";

export function synthFromEnv(actor: string, ctx?: TraceContext): Synth {
  const baseUrl = process.env.SYNTH_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  const apiKey = process.env.SYNTH_API_KEY ?? "";
  return new Synth({ baseUrl, apiKey }, ctx ?? startTrace(actor));
}
