import { defineTool } from "eve/tools";
import { z } from "zod";
import { synthFor } from "../lib/synth.js";

/**
 * Hand a lifecycle stage to a worker subagent. Records the delegation as a ledger event so
 * the handoff is visible in the trace alongside the spans the subagent then produces.
 * (Actual execution happens inside the named subagent under agent/subagents/.)
 */
export default defineTool({
  description:
    "Delegate a model-lifecycle stage to a worker subagent (data_harvester | training_orchestrator | qa_benchmark | field_operator) with a structured objective.",
  inputSchema: z.object({
    subagent: z.enum(["data_harvester", "training_orchestrator", "qa_benchmark", "field_operator"]),
    objective: z.string().min(1),
    inputs: z.record(z.unknown()).optional(),
  }),
  async execute({ subagent, objective, inputs }, ctx) {
    await synthFor("chief_of_staff", ctx.session).ledger.record({
      stage: "delegation",
      notes: `-> ${subagent}: ${objective}`,
      inputs,
    } as any);
    return { delegatedTo: subagent, objective, accepted: true };
  },
});
