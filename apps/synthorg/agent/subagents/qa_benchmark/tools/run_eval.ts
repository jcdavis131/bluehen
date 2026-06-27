import { defineTool } from "eve/tools";
import { z } from "zod";
import { synthFor } from "../../../lib/synth.js";

export default defineTool({
  description: "Evaluate a model version on a rotating held-out slice (Stage 3). Returns intrinsic + extrinsic metrics.",
  inputSchema: z.object({ modelVersion: z.string().min(1), slice: z.string().default("rotating") }),
  async execute({ modelVersion, slice }) {
    return synthFor("qa_benchmark").evals.run(modelVersion, slice);
  },
});
