import { ROUNDS } from "./pairing";

/** Pick counter — blind rank pacing, not lab round dots. */
export function RoundProgress({ round }: { round: number }) {
  return (
    <div className="arena-blind-progress" aria-label={`Pick ${round} of ${ROUNDS}`}>
      <span className="arena-blind-progress-label">
        Pick {round}/{ROUNDS}
      </span>
      <div className="arena-blind-progress-track" aria-hidden>
        <div
          className="arena-blind-progress-fill"
          style={{ width: `${((round - 1) / ROUNDS) * 100}%` }}
        />
      </div>
    </div>
  );
}
