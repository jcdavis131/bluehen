import { defineTool } from "eve/tools";
import { z } from "zod";
import { synthFor } from "../../../lib/synth.js";

const Recipe = z.object({
  baseModel: z.string().default("sentence-transformers/all-MiniLM-L6-v2"),
  loss: z.object({
    infoNceTemp: z.number().default(0.07),
    zeloWeight: z.number().min(0).default(0),
  }).default({}),
  asn: z.object({
    kStrong: z.number().int().default(8),
    kTail: z.number().int().default(8),
    lambda: z.number().min(0).max(1).default(0.5),
    newtonSchulzSteps: z.number().int().default(5),
    matryoshkaDims: z.array(z.number().int()).default([64, 128, 256, 512]),
  }).default({}),
  peft: z.boolean().default(true),
});

export default defineTool({
  description: "Launch an ASN contrastive fine-tuning run on Modal GPUs (Stage 2). Returns a jobId.",
  inputSchema: z.object({ recipe: Recipe }),
  async execute({ recipe }, ctx) {
    return synthFor("training_orchestrator", ctx.session).train.launch(recipe);
  },
});
