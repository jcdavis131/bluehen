/** Fixed demo corpus — rotating eval slice lands in eval-harness later. */

export interface CorpusChunk {
  id: string;
  title: string;
  text: string;
  tags: string[];
}

export const DEMO_CORPUS: CorpusChunk[] = [
  {
    id: "c1",
    title: "Spectral collapse in contrastive learning",
    text: "When encoder outputs concentrate on a low-dimensional cone, effective rank drops toward 1.0 and retrieval diversity collapses even when training loss looks healthy.",
    tags: ["collapse", "effective-rank", "contrastive"],
  },
  {
    id: "c2",
    title: "Multi-hop RAG failure modes",
    text: "Naive bi-encoder retrieval misses bridge documents. Query decomposition and HyDE-style augmentation recover nDCG on multi-hop benchmarks when embeddings preserve rank.",
    tags: ["rag", "multi-hop", "hyde"],
  },
  {
    id: "c3",
    title: "Matryoshka truncation at the edge",
    text: "Matryoshka representation learning trains embeddings useful at 64–768 dims. Quantized int8 serving makes org-specific models practically free at the edge.",
    tags: ["matryoshka", "quantization", "serving"],
  },
  {
    id: "c4",
    title: "ASN sleep-inspired homeostasis",
    text: "AwakenedSleepNet monitors effective rank, applies three-tier spectral surgery, and Newton-Schulz orthogonalization to resist collapse — inspired by sleep, not equivalent to biology.",
    tags: ["asn", "spectral-surgery", "newton-schulz"],
  },
  {
    id: "c5",
    title: "BeIR nDCG@10 baselines",
    text: "Open SOTA embedders (BGE, e5, GTE) set the commercial bar. Org-trained models must beat or match at equal cost after Matryoshka truncation — measured, not marketed.",
    tags: ["beir", "ndcg", "baseline"],
  },
  {
    id: "c6",
    title: "InfoNCE without surgery",
    text: "Plain InfoNCE fine-tuning is the internal control. It often folds before domain adaptation finishes; that's the dumb baseline every ASN run must beat on the rotating slice.",
    tags: ["infonce", "baseline", "control"],
  },
  {
    id: "c7",
    title: "Finance RAG — fictional strategies only",
    text: "Phase B stress-tests embeddings on filings and research narrative, then scores paper trading strategies. No live orders, no money movement — simulation gates only.",
    tags: ["finance", "simulation", "applied-test"],
  },
  {
    id: "c8",
    title: "Projection-head information bottleneck",
    text: "Discard the projector at serve time. Pretrain with an information-bottleneck head so encoder features stay collapse-resistant when the MLP is stripped for inference.",
    tags: ["projection-head", "ib", "serving"],
  },
];
