/**
 * The Verdict (Spec 0031 §2/§7 GAME-004) — server-side probe queries.
 *
 * Never sent to the client as a set: the BFF picks one, fires it at the
 * real /v1/search, and hands back only the resulting passages. Kept
 * research-flavored so the passages judged are genuinely useful margin-
 * ranking signal for the fleet's own corpus, not trivia.
 */
export const VERDICT_PROBE_QUERIES: readonly string[] = [
  "hard negative mining strategies",
  "embedding dimension tradeoffs",
  "contrastive loss temperature tuning",
  "matryoshka representation learning",
  "retrieval-augmented generation grounding failures",
  "cross-encoder reranking latency",
  "domain shift in dense retrieval",
  "quantization effects on nearest neighbor search",
  "multi-vector late interaction retrieval",
  "synthetic query generation for training data",
  "chunk size effects on recall",
  "catastrophic forgetting during fine-tuning",
];

export function pickProbeQuery(): string {
  const i = Math.floor(Math.random() * VERDICT_PROBE_QUERIES.length);
  return VERDICT_PROBE_QUERIES[i];
}
