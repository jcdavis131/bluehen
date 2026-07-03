import { defineTool } from "eve/tools";
import { z } from "zod";
import { synthFor } from "../../../lib/synth.js";

export default defineTool({
  description: "Poll a training job's status and intrinsic metrics (Stage 2).",
  inputSchema: z.object({ jobId: z.string().min(1) }),
  async execute({ jobId }, ctx) {
    return synthFor("training_orchestrator", ctx.session).train.status(jobId);
  },
});
