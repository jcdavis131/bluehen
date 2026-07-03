import { defineTool } from "eve/tools";
import { z } from "zod";
import { synthFor } from "../../../lib/synth.js";

export default defineTool({
  description: "Synthesize query-evidence training pairs from chunked clusters (Stage 1).",
  inputSchema: z.object({ collectionId: z.string().min(1), n: z.number().int().positive().default(1000) }),
  async execute({ collectionId, n }, ctx) {
    return synthFor("data_harvester", ctx.session).data.synthPairs(collectionId, n);
  },
});
