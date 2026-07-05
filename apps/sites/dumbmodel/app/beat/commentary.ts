/**
 * Beat the Baseline Commentator (Spec 0031 §2 GAME-001): deterministic
 * lines keyed by the live result — same query+anchor always gets the
 * same line (no randomness, no LLM key required). Roasts the MODEL when
 * the player poisons it; softer when the baseline holds.
 */
export type BeatResult = "POISONED" | "wounded" | "resisted";

export type CommentaryContext = {
  result: BeatResult;
  query: string;
  anchorId: string;
  topHitTitle: string | null;
};

/** Deterministic string -> 32-bit seed (djb2), same algorithm as the
 * Arena's commentary so the two games feel like one voice. */
function hashSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

const POISONED_LINES: Array<(c: CommentaryContext) => string> = [
  (c) => `Poisoned. The baseline reached for "${c.topHitTitle ?? "something else entirely"}" instead. Beautiful.`,
  () => `That's a clean kill. The baseline didn't even flinch on its way to the wrong answer.`,
  (c) => `The baseline just retrieved "${c.topHitTitle ?? "a completely different paper"}". Confidently. Incorrectly.`,
  () => `Dead on arrival. Your anchor didn't even crack the top five.`,
  () => `The Rank Engine is taking very detailed notes on this one.`,
  (c) => `"${c.topHitTitle ?? "Something unrelated"}" just out-ranked the actual answer. The baseline stands by this.`,
  () => `That query means the same thing to every human alive and to zero embeddings.`,
  () => `Poisoned, and the baseline looks proud of itself. It shouldn't be.`,
  () => `The anchor is gone. Not wounded — gone. Ship this hard negative.`,
  () => `That's the kind of paraphrase that makes an eval-harness go quiet.`,
];

const WOUNDED_LINES: Array<(c: CommentaryContext) => string> = [
  (c) =>
    `Wounded, not dead — the baseline still found it, just barely, behind "${c.topHitTitle ?? "something better-ranked"}".`,
  () => `It's hanging on by rank alone. One more paraphrase and it's over.`,
  () => `The baseline flinched but didn't fall. Respectable pressure, though.`,
  () => `Close. The anchor slipped to the edge of relevance and stayed there.`,
];

const RESISTED_LINES: Array<(c: CommentaryContext) => string> = [
  () => `Resisted. The baseline held its ground — this time.`,
  () => `That paraphrase was too honest. The embeddings saw right through it.`,
  () => `Top three, untouched. Try meaning it a little less literally.`,
  () => `The baseline actually understood you. Rude of it.`,
];

/** Deterministic commentary line for a result — same query+anchor+result
 * combination always renders the same line. */
export function commentaryLine(ctx: CommentaryContext): string {
  const lines =
    ctx.result === "POISONED" ? POISONED_LINES : ctx.result === "wounded" ? WOUNDED_LINES : RESISTED_LINES;
  const idx = hashSeed(`${ctx.result}:${ctx.anchorId}:${ctx.query}`) % lines.length;
  return lines[idx](ctx);
}
