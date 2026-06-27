import { defineTool } from "eve/tools";
import { z } from "zod";
import { synthFor } from "../../../lib/synth.js";

export default defineTool({
  description: "Check a model version against the CI evaluation gates and return promote/reject (Stage 3).",
  inputSchema: z.object({ modelVersion: z.string().min(1) }),
  async execute({ modelVersion }) {
    const gates = await synthFor("qa_benchmark").evals.gates(modelVersion);
    const pass = (gates as any)?.allPassed === true;
    return { modelVersion, decision: pass ? "promote" : "reject", gates };
  },
});
