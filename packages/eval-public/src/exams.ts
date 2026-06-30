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
];

export const RAG_TIERS = [
  { id: "basic", label: "Basic", desc: "Chunk + bi-encoder retrieve" },
  { id: "intermediate", label: "Intermediate", desc: "Hybrid sparse+dense + rerank" },
  { id: "advanced", label: "Advanced", desc: "Multi-hop, decomposition, HyDE" },
] as const;
