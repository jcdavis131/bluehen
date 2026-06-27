import { defineTool } from "eve/tools";
import { z } from "zod";
import { synthFor } from "../lib/synth.js";

/** Append an immutable record of a completed lifecycle stage to the experiment ledger. */
export default defineTool({
  description:
    "Record a completed lifecycle stage (recipe, metric deltas, cost) to the immutable experiment ledger. Call after every stage.",
  inputSchema: z.object({
    stage: z.enum(["collect", "train", "applied_test", "deploy"]),
    modelVersion: z.string().optional(),
    metricDelta: z.record(z.number()).optional(),
    costUsd: z.number().nonnegative().optional(),
    notes: z.string().optional(),
  }),
  async execute(entry) {
    return synthFor("chief_of_staff").ledger.record(entry);
  },
});
