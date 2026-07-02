import { runPanelScorecard, type ExamScorecard } from "@synthaembed/eval-public";

export const dynamic = "force-dynamic";

export function GET(): Response {
  const scorecard: ExamScorecard = runPanelScorecard();
  return Response.json(scorecard);
}
