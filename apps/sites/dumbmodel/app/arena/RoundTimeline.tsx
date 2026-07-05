"use client";

import { LayerStackViz } from "./LayerStackViz";
import { ShapleyPanel } from "./ShapleyPanel";
import type { RoundInsight } from "./types";

/** Per-round Shapley + layer stack — optional “show the math” on reveal. */
export function RoundTimeline({ rounds }: { rounds: RoundInsight[] }) {
  if (rounds.length === 0) return null;

  return (
    <details className="arena-blind-details arena-round-timeline">
      <summary>Round-by-round breakdown</summary>
      <ol className="arena-pick-timeline">
        {rounds.map((r) => (
          <li key={r.round} className="arena-round-timeline-item">
            <div className="arena-round-timeline-head">
              <span className="arena-reveal-rank">R{r.round}</span>
              <span>{r.winnerText}</span>
              <span
                className={`arena-round-timeline-verdict${r.correct ? " is-match" : " is-twist"}`}
              >
                {r.correct ? "called it" : "plot twist"}
              </span>
            </div>
            {r.commentary && <p className="arena-commentary">{r.commentary}</p>}
            {r.shapley && (
              <ShapleyPanel factors={r.shapley.factors} picks={r.shapley.picks} />
            )}
            {r.layerStackBefore && (
              <LayerStackViz stack={r.layerStackBefore} title="Before your pick" />
            )}
            {r.layerStackAfter && (
              <LayerStackViz stack={r.layerStackAfter} title="After your pick" />
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}
