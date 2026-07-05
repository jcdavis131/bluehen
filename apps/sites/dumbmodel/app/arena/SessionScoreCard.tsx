import type { SessionStats } from "./types";

/** Host scorecard after the gauntlet — how often we guessed right. */
export function SessionScoreCard({ stats }: { stats: SessionStats }) {
  const pct = stats.total > 0 ? Math.round((stats.matches / stats.total) * 100) : 0;
  return (
    <div className="arena-score-card">
      <p className="arena-score-headline">
        We guessed you{" "}
        <strong>
          {stats.matches}/{stats.total}
        </strong>{" "}
        times ({pct}%)
      </p>
      <p className="bh-muted arena-score-sub">
        {pct >= 75
          ? "We basically know you. Send this to someone who'll disagree."
          : pct >= 40
            ? "Mixed signals — your taste has edges."
            : "You kept us guessing. Respect."}
      </p>
    </div>
  );
}
