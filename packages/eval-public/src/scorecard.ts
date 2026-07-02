/**
 * Exam scorecard — runs an MCQ exam against the baseline panel.
 *
 * DEMO MODE (now): each model "retrieves" chunks in order of its per-chunk
 * retrievalBias (see baselines.ts). A question is answered correctly when its
 * sourceChunkId lands in the top-k. This produces a stable, honest scorecard
 * shape without a trained model or GPU.
 *
 * LIVE MODE (P6-run): the same scorecard shape is filled by real retrieval —
 * org-embed / BGE / e5 / openai vectors over data/corpora/research/corpus.jsonl,
 * ranked by cosine, with the source chunk's real rank deciding the hit. Only
 * the `mode` field and the per-model numbers change.
 */

import { BASELINE_MODELS, type BaselineModel } from "./baselines";
import { DEMO_CORPUS, type CorpusChunk } from "./corpus";
import { ARXIV_MCQ_QUESTIONS, type McqQuestion } from "./exams";

export const DEFAULT_TOP_K = 3;

export interface QuestionResult {
  qId: string;
  /** 1-based rank of the source chunk in this model's retrieved list, or null if outside corpus. */
  rank: number | null;
  /** True when the source chunk placed within top-k. */
  hit: boolean;
}

export interface ModelScore {
  modelId: string;
  name: string;
  vendor: string;
  isHen?: boolean;
  /** Fraction of questions answered correctly (hit within top-k). */
  accuracy: number;
  /** Mean reciprocal rank of the source chunk across questions. */
  mrr: number;
  perQuestion: QuestionResult[];
}

export interface ExamScorecard {
  examId: string;
  mode: "demo" | "live";
  topK: number;
  generatedAt: string;
  panel: ModelScore[];
}

/**
 * Rank corpus chunk ids for a model in demo mode: descending retrievalBias,
 * ties broken by chunk id for determinism. Chunks with no bias entry sort last.
 */
function demoRank(model: BaselineModel, chunks: CorpusChunk[]): string[] {
  return [...chunks].sort((a, b) => {
    const wa = model.retrievalBias[a.id] ?? -1;
    const wb = model.retrievalBias[b.id] ?? -1;
    if (wa !== wb) return wb - wa;
    return a.id < b.id ? -1 : 1;
  }).map((c) => c.id);
}

function scoreModel(
  model: BaselineModel,
  questions: McqQuestion[],
  chunks: CorpusChunk[],
  topK: number,
): ModelScore {
  const ranked = demoRank(model, chunks);
  const perQuestion: QuestionResult[] = questions.map((q) => {
    const rank = ranked.indexOf(q.sourceChunkId);
    const r = rank < 0 ? null : rank + 1;
    return { qId: q.id, rank: r, hit: r !== null && r <= topK };
  });
  const hits = perQuestion.filter((p) => p.hit).length;
  const accuracy = perQuestion.length ? hits / perQuestion.length : 0;
  const mrr =
    perQuestion.length
      ? perQuestion.reduce((acc, p) => acc + (p.rank ? 1 / p.rank : 0), 0) / perQuestion.length
      : 0;
  return {
    modelId: model.id,
    name: model.name,
    vendor: model.vendor,
    isHen: model.isHen,
    accuracy: round(accuracy, 3),
    mrr: round(mrr, 3),
    perQuestion,
  };
}

export function runPanelScorecard(
  questions: McqQuestion[] = ARXIV_MCQ_QUESTIONS,
  opts: { topK?: number; mode?: "demo" | "live" } = {},
): ExamScorecard {
  const topK = opts.topK ?? DEFAULT_TOP_K;
  const mode = opts.mode ?? "demo";
  const panel = BASELINE_MODELS.map((m) => scoreModel(m, questions, DEMO_CORPUS, topK));
  // Highest accuracy first; MRR breaks ties; hen wins a dead tie for narrative clarity.
  panel.sort((a, b) => b.accuracy - a.accuracy || b.mrr - a.mrr || (b.isHen ? 1 : 0) - (a.isHen ? 1 : 0));
  return {
    examId: "arxiv-mcq",
    mode,
    topK,
    generatedAt: new Date().toISOString(),
    panel,
  };
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
