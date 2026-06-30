/** Baseline panel — demo metrics until eval-harness feeds live gates. */

export interface BaselineModel {
  id: string;
  name: string;
  vendor: string;
  /** exp(entropy(normalized σ)) on held-out encoder — lower = more collapsed */
  effectiveRank: number;
  ndcg10: number;
  /** 0 = genius hen, 100 = maximum cone */
  dumbnessScore: number;
  isHen?: boolean;
  tagline: string;
  /** Per-chunk retrieval bias for demo compare (chunk id → weight 0–1) */
  retrievalBias: Record<string, number>;
}

export const BASELINE_MODELS: BaselineModel[] = [
  {
    id: "infonce",
    name: "Plain InfoNCE",
    vendor: "control",
    effectiveRank: 3.8,
    ndcg10: 0.39,
    dumbnessScore: 96,
    tagline: "Folded before lunch.",
    retrievalBias: { c6: 0.95, c1: 0.7, c5: 0.4, c2: 0.15, c4: 0.1, c3: 0.08, c7: 0.05, c8: 0.05 },
  },
  {
    id: "openai-small",
    name: "text-embedding-3-small",
    vendor: "commercial",
    effectiveRank: 11.2,
    ndcg10: 0.48,
    dumbnessScore: 71,
    tagline: "API-priced cone.",
    retrievalBias: { c5: 0.85, c2: 0.55, c1: 0.45, c3: 0.35, c6: 0.3, c4: 0.2, c7: 0.15, c8: 0.12 },
  },
  {
    id: "e5",
    name: "e5-large-v2",
    vendor: "Microsoft",
    effectiveRank: 14.6,
    ndcg10: 0.51,
    dumbnessScore: 62,
    tagline: "Strong average, still folds on hard slices.",
    retrievalBias: { c5: 0.8, c2: 0.6, c3: 0.5, c1: 0.45, c6: 0.4, c4: 0.25, c8: 0.2, c7: 0.1 },
  },
  {
    id: "bge",
    name: "BGE-M3",
    vendor: "BAAI",
    effectiveRank: 18.4,
    ndcg10: 0.54,
    dumbnessScore: 54,
    tagline: "SOTA until you measure rank.",
    retrievalBias: { c5: 0.75, c2: 0.65, c3: 0.55, c4: 0.4, c1: 0.4, c8: 0.35, c6: 0.3, c7: 0.2 },
  },
  {
    id: "qwen3-emb",
    name: "Qwen3-Embedding-0.6B",
    vendor: "Alibaba",
    effectiveRank: 22.1,
    ndcg10: 0.56,
    dumbnessScore: 44,
    tagline: "Open weights, open to collapse.",
    retrievalBias: { c2: 0.7, c4: 0.6, c5: 0.58, c3: 0.5, c8: 0.45, c1: 0.4, c6: 0.35, c7: 0.25 },
  },
  {
    id: "blue-hen",
    name: "Blue Hen RE · ASN org",
    vendor: "Blue Hen RE",
    effectiveRank: 49.6,
    ndcg10: 0.61,
    dumbnessScore: 11,
    isHen: true,
    tagline: "Awake. Ranked. Not a cone.",
    retrievalBias: { c4: 0.92, c2: 0.88, c8: 0.85, c3: 0.8, c1: 0.78, c5: 0.75, c7: 0.7, c6: 0.65 },
  },
];

export function getModel(id: string): BaselineModel | undefined {
  return BASELINE_MODELS.find((m) => m.id === id);
}

export function hallOfCone(): BaselineModel[] {
  return [...BASELINE_MODELS].sort((a, b) => a.effectiveRank - b.effectiveRank);
}
