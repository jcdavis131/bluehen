export type TierId = "S" | "A" | "B" | "C" | "D";

export type TierMeta = {
  id: TierId;
  label: string;
  tagline: string;
};

export const TIERS: TierMeta[] = [
  { id: "S", label: "S tier", tagline: "No notes. Perfect." },
  { id: "A", label: "A tier", tagline: "Would fight someone for it." },
  { id: "B", label: "B tier", tagline: "Solid. No complaints." },
  { id: "C", label: "C tier", tagline: "Only if nothing else is open." },
  { id: "D", label: "D tier", tagline: "Respectfully… no." },
];

/** Map 0-based rank index to a tier bucket (blind-rank video style). */
export function tierForRank(index: number, total: number): TierId {
  if (total <= 0) return "D";
  const pct = index / total;
  if (pct < 0.125) return "S";
  if (pct < 0.3125) return "A";
  if (pct < 0.5625) return "B";
  if (pct < 0.8125) return "C";
  return "D";
}

export type RankedForTier = { id: string; text: string; rank: number };

export type TierGroup = TierMeta & { items: RankedForTier[] };

/** Bucket ranked items into S→D tiers for the reveal screen. */
export function groupIntoTiers(ranked: { id: string; text: string }[]): TierGroup[] {
  return TIERS.map((tier) => ({
    ...tier,
    items: ranked
      .map((item, i) => ({ ...item, rank: i + 1 }))
      .filter((item) => tierForRank(item.rank - 1, ranked.length) === tier.id),
  })).filter((g) => g.items.length > 0);
}
