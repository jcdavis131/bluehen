/**
 * The Commentator, V1 (Spec 0029 §2): deterministic persona lines in
 * dumbmodel's roast voice — roasts picks, never players. Keyed by round
 * + the two items in play so the same matchup always gets the same
 * line (no randomness, no LLM key required).
 */
import { hashSeed } from "./pairing";

export type CommentaryContext = {
  round: number;
  winnerId: string;
  winnerText: string;
  loserId: string;
  loserText: string;
};

function shortLabel(id: string): string {
  return id.replace(/-/g, " ");
}

const LINES: Array<(c: CommentaryContext) => string> = [
  (c) => `Bold. The ${shortLabel(c.loserId)} faction will remember this.`,
  (c) => `Round ${c.round} and you've already betrayed everything you picked in round one.`,
  (c) => `That pick has main-character energy. Concerning.`,
  (c) => `The ${shortLabel(c.loserId)} camp is filing a complaint. It has a case.`,
  (c) => `Confident tap. Let's see if that holds by round twelve.`,
  (c) => `Decisive. The Rank Engine is taking notes.`,
  (c) => `That's the kind of pick that starts a rivalry two rounds from now.`,
  (c) => `No hesitation there. Respect, and a little concern.`,
  (c) => `The eliminated ${shortLabel(c.loserId)} asks for one more debate. Denied.`,
  (c) => `That's a top-three take and you know it.`,
  (c) => `Bold pivot from your last pick. Your taste vector looks confused.`,
  (c) => `Somewhere, a focus group is nodding along with you.`,
  (c) => `You picked that fast. Instinct or chaos — unclear.`,
  (c) => `The Commentator has seen this pick before. It usually ages well.`,
  (c) => `That's going straight to the top of the board. Probably.`,
];

/** Deterministic line for a round's outcome — same matchup, same line. */
export function commentaryLine(ctx: CommentaryContext): string {
  const idx = hashSeed(`${ctx.round}:${ctx.winnerId}:${ctx.loserId}`) % LINES.length;
  return LINES[idx](ctx);
}
