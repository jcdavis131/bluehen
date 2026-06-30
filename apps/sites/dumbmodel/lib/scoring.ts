import type { BaselineModel } from "./baselines";
import { DEMO_CORPUS, type CorpusChunk } from "./corpus";

const STOP = new Set(
  "a an the is are was were be been being and or but in on at to for of with by from as it its this that these those".split(
    " ",
  ),
);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function overlapScore(query: string, chunk: CorpusChunk): number {
  const q = new Set(tokens(query));
  if (q.size === 0) return 0;
  const c = tokens(`${chunk.title} ${chunk.text} ${chunk.tags.join(" ")}`);
  let hits = 0;
  for (const t of c) if (q.has(t)) hits++;
  return hits / q.size;
}

export interface RankedHit {
  chunk: CorpusChunk;
  score: number;
}

export function rankForModel(query: string, model: BaselineModel, k = 3): RankedHit[] {
  const scored = DEMO_CORPUS.map((chunk) => {
    const lexical = overlapScore(query, chunk);
    const bias = model.retrievalBias[chunk.id] ?? 0.2;
    const score = lexical * 0.55 + bias * 0.45;
    return { chunk, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

export function dumbnessLabel(score: number): string {
  if (score >= 90) return "Maximum cone";
  if (score >= 70) return "Pretty dumb";
  if (score >= 50) return "SOTA-ish";
  if (score >= 30) return "Trying";
  return "Suspiciously smart";
}
