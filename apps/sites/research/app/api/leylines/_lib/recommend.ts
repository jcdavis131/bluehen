/**
 * Shared shapes + a topic list for Leylines (Spec 0031 §2/§7, GAME-003).
 * The /v1/recommend response shape (services/core-api/app/services/recommend.py
 * ::_shape): { modelVersion, recommendations: [{ id, title, score, reason,
 * url, metadata }] }.
 */

export type RecommendHit = {
  id: string;
  title: string;
  score: number;
  reason: string;
  url?: string | null;
  metadata?: Record<string, unknown>;
};

export type RecommendResponse = {
  modelVersion: string | null;
  recommendations: RecommendHit[];
};

export function isRecommendResponse(data: unknown): data is RecommendResponse {
  return (
    !!data &&
    typeof data === "object" &&
    Array.isArray((data as Record<string, unknown>).recommendations)
  );
}

/** ~10 deliberately spread-out arXiv topics (Spec 0031 §2 P1). Two distinct
 * probes from this list are how /start picks papers that are "far apart" —
 * cross-domain distance is the whole point of the game. */
export const PROBE_TOPICS: readonly string[] = [
  "graph neural networks for molecular property prediction",
  "protein structure prediction and folding dynamics",
  "reinforcement learning for robotic manipulation",
  "quantum error correction codes",
  "uncertainty quantification in climate models",
  "large language model alignment and safety",
  "computer vision for medical imaging diagnosis",
  "distributed systems consensus protocols",
  "behavioral economics of financial markets",
  "topology of neural network loss landscapes",
];

export function pickTopic(exclude?: string): string {
  const pool = exclude ? PROBE_TOPICS.filter((t) => t !== exclude) : PROBE_TOPICS;
  return pool[Math.floor(Math.random() * pool.length)] ?? PROBE_TOPICS[0];
}

export function pickHit(hits: RecommendHit[], exclude?: string): RecommendHit | null {
  const pool = exclude ? hits.filter((h) => h.id !== exclude) : hits;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}
