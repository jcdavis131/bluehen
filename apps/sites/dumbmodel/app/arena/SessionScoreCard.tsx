import type { SessionStats } from "./types";

/** End-of-run score — how often the player matched the model. */
export function SessionScoreCard({ stats }: { stats: SessionStats }) {
  const pct = stats.total > 0 ? Math.round((stats.matches / stats.total) * 100) : 0;
  return (
    <div className="arena-score-card">
      <p className="arena-score-headline">
        You matched the model{" "}
        <strong>
          {stats.matches}/{stats.total}
        </strong>{" "}
        times ({pct}%)
      </p>
      <p className="bh-muted arena-score-sub">
        {pct >= 75
          ? "The rank engine is reading you clearly."
          : pct >= 40
            ? "Mixed signals — your taste has edges the model is still learning."
            : "You kept the model guessing. Play again and watch the layer stack shift."}
      </p>
    </div>
  );
}
