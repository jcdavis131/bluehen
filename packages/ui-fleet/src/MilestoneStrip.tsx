import type { LedgerEntry } from "./RaceFeed";

interface ModelRow {
  version?: string;
  deployed?: boolean;
}

interface Milestone {
  label: string;
  achievedAt: string | null;
}

/** Milestones — the platform's "firsts", computed from the ledger and
 * model registry. Quiet, professional: achieved shows the date; pending
 * stays muted. Server-renderable. */
export function MilestoneStrip({
  ledger,
  models,
}: {
  ledger: LedgerEntry[];
  models?: ModelRow[];
}) {
  const firstOf = (...stages: string[]): string | null => {
    let earliest: string | null = null;
    for (const e of ledger) {
      if (!e.ts || !stages.includes(e.stage)) continue;
      if (earliest === null || e.ts < earliest) earliest = e.ts;
    }
    return earliest;
  };

  const milestones: Milestone[] = [
    { label: "First hill-climb", achievedAt: firstOf("train", "hill_climb") },
    { label: "First eval", achievedAt: firstOf("eval") },
    {
      label: "First deployed model",
      achievedAt:
        firstOf("deploy") ?? (models?.some((m) => m.deployed) ? "" : null),
    },
    { label: "First BD charter", achievedAt: firstOf("charter") },
    { label: "First index", achievedAt: firstOf("index") },
  ];

  const fmt = (ts: string | null) => {
    if (ts === null) return "pending";
    if (ts === "") return "achieved";
    const d = new Date(ts);
    return Number.isNaN(d.getTime())
      ? "achieved"
      : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="bh-milestones" aria-label="Platform milestones">
      {milestones.map((m) => {
        const done = m.achievedAt !== null;
        return (
          <span key={m.label} className={`bh-milestone${done ? " is-done" : ""}`}>
            <span className="bh-milestone__mark" aria-hidden>
              {done ? "●" : "○"}
            </span>
            {m.label}
            <span className="bh-milestone__date bh-mono">{fmt(m.achievedAt)}</span>
          </span>
        );
      })}
    </div>
  );
}
