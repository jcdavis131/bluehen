import { defineTool } from "eve/tools";
import { z } from "zod";
import { synthFor } from "../../../lib/synth.js";

export default defineTool({
  description: "Sample recent production queries and report retrieval-drift signals (Stage 4).",
  inputSchema: z.object({ probeQuery: z.string().min(1), k: z.number().int().positive().default(10) }),
  async execute({ probeQuery, k }) {
    const hits = await synthFor("field_operator").vector.search(probeQuery, k);
    const scores = ((hits as any)?.hits ?? []).map((h: any) => h.score ?? 0);
    const mean = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
    return { probeQuery, meanTopKScore: mean, driftSuspected: mean < 0.3, hits };
  },
});
