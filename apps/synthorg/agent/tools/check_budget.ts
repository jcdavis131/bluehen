import { defineTool } from "eve/tools";
import { z } from "zod";
import { synthFor } from "../lib/synth.js";

/** Gate any compute-incurring action on the workspace's daily budget. */
export default defineTool({
  description:
    "Check the mini-org's remaining daily compute budget before delegating any task that spends compute. Returns spent, ceiling, and remaining (USD).",
  inputSchema: z.object({
    estimatedCostUsd: z.number().nonnegative().optional(),
  }),
  async execute({ estimatedCostUsd }) {
    const budget = await synthFor("chief_of_staff").ledger.budget();
    const remaining = (budget as any)?.remainingUsd ?? null;
    const wouldExceed =
      estimatedCostUsd != null && remaining != null ? estimatedCostUsd > remaining : false;
    return { ...(budget as object), estimatedCostUsd, wouldExceed };
  },
});
