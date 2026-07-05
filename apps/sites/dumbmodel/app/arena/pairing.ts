/**
 * The Gauntlet pairing (Spec 0029 §1.2, refined Spec 0032): 8 rounds,
 * session seed. Phase 1 (rounds 1-4): shuffle the deck, pair sequentially.
 * Phase 2 (rounds 5-8): the previous round's pick faces an item it hasn't
 * remaining unseen pool (wrapping if the pool is smaller than the round
 * count — true for 16-item decks, where the pool is 4 items).
 *
 * Every deck ships with 16-24 items (spec §1.1), so phase 1 always has
 * enough items and phase 2's unseen pool is never empty.
 */
import type { ArenaItem } from "./decks";

export const ROUNDS = 8;
const PHASE1_ROUNDS = 4;

/** mulberry32 — small, fast, deterministic PRNG from a numeric seed. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic string -> 32-bit seed (djb2). */
export function hashSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

export function shuffledOrder(items: ArenaItem[], seed: number): ArenaItem[] {
  const rng = mulberry32(seed);
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export type GauntletPlan = {
  order: ArenaItem[];
  /** Items held back from phase 1, fed into phase 2 as fresh challengers. */
  unseenPool: ArenaItem[];
};

export function buildPlan(items: ArenaItem[], seed: number): GauntletPlan {
  const order = shuffledOrder(items, seed);
  // Every deck ships with >=16 items, so PHASE1_ROUNDS*2 (12) always
  // leaves >=4 items unseen for phase 2.
  const used = Math.min(PHASE1_ROUNDS * 2, order.length);
  return {
    order,
    unseenPool: order.slice(used).length > 0 ? order.slice(used) : order,
  };
}

/** Round is 1-indexed (1..ROUNDS). `lastWinner` is required once round > PHASE1_ROUNDS. */
export function pairForRound(
  plan: GauntletPlan,
  round: number,
  lastWinner: ArenaItem | null,
): [ArenaItem, ArenaItem] {
  if (round <= PHASE1_ROUNDS) {
    const i = (round - 1) * 2;
    return [plan.order[i], plan.order[i + 1]];
  }
  const pool = plan.unseenPool.length > 0 ? plan.unseenPool : plan.order;
  const challenger = pool[(round - PHASE1_ROUNDS - 1) % pool.length];
  const champion = lastWinner ?? plan.order[0];
  return [champion, challenger];
}

export { PHASE1_ROUNDS };
