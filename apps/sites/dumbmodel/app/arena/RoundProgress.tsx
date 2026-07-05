import { ROUNDS } from "./pairing";

/** Round dots — quick orientation on mobile. */
export function RoundProgress({ round }: { round: number }) {
  return (
    <div className="arena-progress" aria-label={`Round ${round} of ${ROUNDS}`}>
      {Array.from({ length: ROUNDS }, (_, i) => {
        const n = i + 1;
        let state = "upcoming";
        if (n < round) state = "done";
        if (n === round) state = "current";
        return (
          <span
            key={n}
            className={`arena-progress-dot is-${state}`}
            aria-hidden
          />
        );
      })}
    </div>
  );
}
