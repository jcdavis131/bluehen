import { defineTool } from "eve/tools";
import { z } from "zod";
import { synthFor } from "../../../lib/synth.js";

export default defineTool({
  description: "Chunk a document into coherent passages via LMAR semantic clustering (Stage 1).",
  inputSchema: z.object({
    docId: z.string().min(1),
    simThreshold: z.number().min(0).max(1).default(0.7),
  }),
  async execute({ docId, simThreshold }, ctx) {
    return synthFor("data_harvester", ctx.session).data.chunk(docId, { simThreshold });
  },
});
