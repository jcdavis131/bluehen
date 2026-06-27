import { defineTool } from "eve/tools";
import { z } from "zod";
import { synthFor } from "../../../lib/synth.js";

export default defineTool({
  description:
    "Deploy a promoted model to serving with Matryoshka truncation + quantization (Stage 4). High blast radius: requires prior Operator approval.",
  inputSchema: z.object({
    modelVersion: z.string().min(1),
    truncateDims: z.number().int().positive().optional(),
    quant: z.enum(["int8", "binary", "none"]).default("int8"),
    operatorApproved: z.boolean(),
  }),
  async execute({ modelVersion, truncateDims, quant, operatorApproved }) {
    if (!operatorApproved) {
      return { deployed: false, reason: "Operator approval required before production deploy." };
    }
    return synthFor("field_operator").model.deploy(modelVersion, { truncateDims, quant });
  },
});
