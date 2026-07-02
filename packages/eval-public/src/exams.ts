/** Benchmark exam catalog — migrate from agent-lasso YAML over time. */

export interface BenchmarkExam {
  id: string;
  title: string;
  domain: string;
  questions: number;
  tier: "basic" | "intermediate" | "advanced";
  lastRunNdcg?: number;
}

export const BENCHMARK_EXAMS: BenchmarkExam[] = [
  { id: "beir-msmarco", title: "BEIR MS MARCO slice", domain: "retrieval", questions: 50, tier: "basic", lastRunNdcg: 0.54 },
  { id: "multihop-bridge", title: "Multi-hop bridge docs", domain: "rag", questions: 40, tier: "advanced", lastRunNdcg: 0.41 },
  { id: "hyde-augmented", title: "HyDE query augmentation", domain: "rag", questions: 35, tier: "advanced", lastRunNdcg: 0.48 },
  { id: "hybrid-bm25", title: "Hybrid BM25 + dense", domain: "rag", questions: 60, tier: "intermediate", lastRunNdcg: 0.57 },
  { id: "rotating-slice", title: "Rotating eval slice (spec 0005)", domain: "platform", questions: 100, tier: "basic", lastRunNdcg: 0.61 },
  { id: "arxiv-mcq", title: "arXiv embedding/retrieval MCQ", domain: "arxiv", questions: 8, tier: "intermediate" },
];

export const RAG_TIERS = [
  { id: "basic", label: "Basic", desc: "Chunk + bi-encoder retrieve" },
  { id: "intermediate", label: "Intermediate", desc: "Hybrid sparse+dense + rerank" },
  { id: "advanced", label: "Advanced", desc: "Multi-hop, decomposition, HyDE" },
] as const;

/**
 * arXiv MCQ exam — the sellable scorecard for arxiviq.com.
 *
 * Each question is answerable from a single source chunk in DEMO_CORPUS (the
 * fixed demo corpus). Scoring simulates retrieval: a model "retrieves" chunks
 * in order of its per-chunk retrievalBias, and a question is answered correctly
 * when its sourceChunkId lands in the top-k.
 *
 * Source chunks are drawn from the research-domain subset {c1,c2,c3,c4,c8}
 * (collapse, multi-hop, matryoshka, ASN, projection-head) — the in-domain
 * content EVIDENCE §3.6/§3.7 measures the org model to retrieve better than
 * general commercial embedders. The off-domain c7 (finance) and the
 * baseline/control framing chunks are not used as sources, so the per-model
 * bias distribution differentiates the panel instead of canceling out.
 *
 * This is the demo scorecard shape; P6-run swaps the retrievalBias simulation
 * for real org-embed / BGE / e5 vectors over data/corpora/research/corpus.jsonl
 * and fills the same scorecard with live numbers.
 */
export interface McqQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  /** DEMO_CORPUS chunk id that contains the answer. */
  sourceChunkId: string;
  rationale: string;
}

export const ARXIV_MCQ_QUESTIONS: McqQuestion[] = [
  {
    id: "q1",
    prompt: "What happens to effective rank when an encoder's outputs concentrate on a low-dimensional cone?",
    options: [
      "It drops toward 1.0",
      "It rises toward the hidden dimension",
      "It stays equal to the batch size",
      "It becomes negative",
    ],
    correctIndex: 0,
    sourceChunkId: "c1",
    rationale: "Cone concentration collapses effective rank toward 1.0 even when training loss looks healthy.",
  },
  {
    id: "q2",
    prompt: "Matryoshka representation learning trains embeddings that remain useful at which kind of dimension range?",
    options: [
      "Only the full hidden width",
      "Multiple truncated prefix lengths (e.g. 64–768)",
      "A single fixed 768-dim vector",
      "Binary hashes only",
    ],
    correctIndex: 1,
    sourceChunkId: "c3",
    rationale: "MRL trains nested prefixes so the representation degrades gracefully when truncated.",
  },
  {
    id: "q3",
    prompt: "On multi-hop benchmarks, which augmentation recovers nDCG when embeddings preserve rank?",
    options: [
      "Increasing batch size",
      "Query decomposition and HyDE-style augmentation",
      "Removing the projector at serve time",
      "Switching to BM25 only",
    ],
    correctIndex: 1,
    sourceChunkId: "c2",
    rationale: "Naive bi-encoders miss bridge docs; decomposition + HyDE recover nDCG when rank is preserved.",
  },
  {
    id: "q4",
    prompt: "What does AwakenedSleepNet monitor to decide when to intervene against collapse?",
    options: ["Effective rank", "Training loss", "Batch size", "Query latency"],
    correctIndex: 0,
    sourceChunkId: "c4",
    rationale: "ASN monitors effective rank and applies spectral surgery + Newton-Schulz when it drops.",
  },
  {
    id: "q5",
    prompt: "Why discard the projection head at serve time?",
    options: [
      "To increase total parameter count",
      "To force a low-rank cone",
      "So encoder features stay collapse-resistant when the MLP is stripped for inference",
      "To enable live order placement",
    ],
    correctIndex: 2,
    sourceChunkId: "c8",
    rationale: "Pretrain with an information-bottleneck head so the encoder stays collapse-resistant without it.",
  },
  {
    id: "q6",
    prompt: "Naive bi-encoder retrieval tends to miss which kind of document in multi-hop RAG?",
    options: ["Bridge documents", "The query itself", "Truncated prefixes", "int8 quantization tables"],
    correctIndex: 0,
    sourceChunkId: "c2",
    rationale: "Naive bi-encoders miss bridge documents; decomposition + HyDE recover them when rank is preserved.",
  },
  {
    id: "q7",
    prompt: "AwakenedSleepNet resists collapse using which two operations?",
    options: [
      "Three-tier spectral surgery and Newton-Schulz orthogonalization",
      "BM25 and HyDE augmentation",
      "int8 quantization and Matryoshka truncation",
      "Order placement and brokerage integration",
    ],
    correctIndex: 0,
    sourceChunkId: "c4",
    rationale: "ASN applies three-tier spectral surgery + Newton-Schulz orthogonalization, inspired by sleep.",
  },
  {
    id: "q8",
    prompt: "Pretraining with an information-bottleneck projection head serves what purpose?",
    options: [
      "Increasing the served parameter count",
      "Forcing a low-dimensional cone at inference",
      "Keeping encoder features collapse-resistant without the head at inference",
      "Enabling live trading",
    ],
    correctIndex: 2,
    sourceChunkId: "c8",
    rationale: "The IB head is discarded at serve time; the encoder retains collapse-resistant features.",
  },
];
