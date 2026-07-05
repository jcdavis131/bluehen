/**
 * The Verdict — 10 deterministic lab-voice lines (Spec 0031 §2/§7
 * GAME-004), 5 keyed to agreement and 5 to disagreement. Deterministic
 * (indexed by cases-judged count, not random) so the voice cycles
 * predictably rather than repeating or feeling arbitrary.
 */
const AGREE_LINES: readonly string[] = [
  "Consistent with the record. The engine concurs.",
  "Correlation holds — same call, same evidence.",
  "The bench agrees with the judge.",
  "No exception filed. The ranking stands.",
  "Independently reproduced. The engine's read matches yours.",
];

const DISAGREE_LINES: readonly string[] = [
  "Exception noted — the engine ranked the other exhibit higher.",
  "A split verdict. Recorded for review, not overruled.",
  "The bench and the judge diverge here. That gap is the finding.",
  "Filed as a minority report against the current ranking.",
  "Disagreement entered into evidence. This is where the model learns.",
];

export function pickLabVoiceLine(engineAgreed: boolean, casesJudged: number): string {
  const pool = engineAgreed ? AGREE_LINES : DISAGREE_LINES;
  const i = ((casesJudged % pool.length) + pool.length) % pool.length;
  return pool[i];
}
