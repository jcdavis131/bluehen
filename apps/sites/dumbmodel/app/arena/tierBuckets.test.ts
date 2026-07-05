/**
 * Tier bucket invariants for Blind Rank reveal.
 * Run: node --experimental-strip-types --test app/arena/tierBuckets.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupIntoTiers, tierForRank } from "./tierBuckets.ts";

describe("tierForRank", () => {
  it("puts the top items in S tier for a 16-item deck", () => {
    assert.equal(tierForRank(0, 16), "S");
    assert.equal(tierForRank(1, 16), "S");
  });

  it("puts the bottom item in D tier", () => {
    assert.equal(tierForRank(15, 16), "D");
  });
});

describe("groupIntoTiers", () => {
  it("assigns every item exactly once", () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      id: `item-${i}`,
      text: `Item ${i}`,
    }));
    const groups = groupIntoTiers(items);
    const total = groups.reduce((n, g) => n + g.items.length, 0);
    assert.equal(total, 8);
  });
});
