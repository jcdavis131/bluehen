/**
 * Eve instrumentation for the synthorg agent (Spec 0006).
 *
 * `agent/instrumentation.ts` is Eve's designated slot for model-call telemetry. The
 * `step.started` hook fires before each AI SDK model call with the active session
 * lineage, so we stamp the synth trace id onto every model-call telemetry span. This
 * makes model calls join the same objective trace as the tool-call service spans
 * (see ./lib/trace.ts), so `synth trace view` can replay a whole objective end to end:
 * chief model calls, subagent delegations, subagent model calls, and every service span.
 *
 * Tool-call service spans are wired per-tool via `ctx.session` -> `synthFor(actor, ctx.session)`
 * (see ./lib/synth.ts); this file covers the model-call half of "every call produces a span"
 * (Spec 0006 acceptance criterion #2).
 */
import { defineInstrumentation } from "eve/instrumentation";
import { traceContextFromSession } from "./lib/trace.js";

export default defineInstrumentation({
  // Record model I/O in telemetry so objective replays are complete; flip to false if
  // sensitive payloads need to stay out of the trace store.
  recordInputs: true,
  recordOutputs: true,
  events: {
    "step.started": ({ session }) => {
      const ctx = traceContextFromSession(session, "model");
      return {
        runtimeContext: {
          "synth.traceId": ctx.traceId,
          "synth.spanId": ctx.spanId,
          "synth.parentSpan": ctx.parentSpan ?? null,
          "synth.sessionId": session.id,
        },
      };
    },
  },
});
