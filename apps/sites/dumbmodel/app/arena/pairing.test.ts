/**
 * Pairing invariants (Spec 0032): 8 rounds, no duplicate pairs in phase 1.
 * Run: node --experimental-strip-types --test app/arena/pairing.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ROUNDS,
  buildPlan,
  hashSeed,
  pairForRound,
  shuffledOrder,
} from "./pairing.ts";

const SAMPLE_ITEMS = Array.from({ length: 16 }, (_, i) => ({
  id: `item-${i}`,
  text: `Item ${i}`,
}));

describe("pairing", () => {
  it("runs exactly 8 rounds", () => {
    assert.equal(ROUNDS, 8);
  });

  it("phase 1 uses 8 distinct items across 4 rounds", () => {
    const plan = buildPlan(SAMPLE_ITEMS, hashSeed("test-seed"));
    const seen = new Set<string>();
    for (let round = 1; round <= 4; round++) {
      const [a, b] = pairForRound(plan, round, null);
      assert.notEqual(a.id, b.id);
      seen.add(a.id);
      seen.add(b.id);
    }
    assert.equal(seen.size, 8);
  });

  it("phase 2 reuses last winner as champion", () => {
    const plan = buildPlan(SAMPLE_ITEMS, hashSeed("phase2"));
    const [a, b] = pairForRound(plan, 4, null);
    const winner = a;
    const [left, right] = pairForRound(plan, 5, winner);
    assert.ok(left.id === winner.id || right.id === winner.id);
  });

  it("is deterministic for a fixed seed", () => {
    const seed = hashSeed("stable");
    const orderA = shuffledOrder(SAMPLE_ITEMS, seed).map((x) => x.id).join(",");
    const orderB = shuffledOrder(SAMPLE_ITEMS, seed).map((x) => x.id).join(",");
    assert.equal(orderA, orderB);
  });
});
