import queueJson from "../../../content/fleet/bd/queue.json" with { type: "json" };

export interface BdQueueCandidate {
  id: string;
  siteId: string;
  method: string;
  status: "awaiting_pilot" | "in_execution" | "rejected";
  submittedAt: string;
  recipe: Record<string, unknown>;
  evidenceRef: string;
  gates: Record<string, unknown>;
  notes?: string;
}

export interface BdQueue {
  version: number;
  updated: string;
  description: string;
  candidates: BdQueueCandidate[];
}

const queue = queueJson as BdQueue;

/** Validation Queue — Research → BD promotion pipeline (Spec 0012). */
export function getBdQueue(): BdQueue {
  return queue;
}

export function getBdQueueForSite(siteId: string): BdQueueCandidate[] {
  return queue.candidates.filter((c) => c.siteId === siteId);
}
