import { defineTool } from "eve/tools";
import { z } from "zod";
import { synthFor } from "../../../lib/synth.js";

export default defineTool({
  description: "Ingest a raw corpus into the workspace store (Stage 1: collect).",
  inputSchema: z.object({ corpusUri: z.string().url().or(z.string().min(1)) }),
  async execute({ corpusUri }, ctx) {
    return synthFor("data_harvester", ctx.session).data.ingest(corpusUri);
  },
});
