"use client";

import { useEffect, useState } from "react";

export interface ExplorationSurface {
  id: string;
  label: string;
  href: string;
}

const STORAGE_KEY = "bh-explored-surfaces";

/** Quiet completion drive: tracks (locally, on the visitor's device only)
 * which fleet surfaces they have opened and suggests the next one.
 * No accounts, no server — localStorage. */
export function ExplorationTracker({
  surfaces,
  currentId,
}: {
  surfaces: ExplorationSurface[];
  currentId: string;
}) {
  const [visited, setVisited] = useState<string[] | null>(null);

  useEffect(() => {
    let seen: string[] = [];
    try {
      seen = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
    } catch {
      seen = [];
    }
    if (!seen.includes(currentId)) {
      seen = [...seen, currentId];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
      } catch {
        // storage unavailable — tracker stays session-only
      }
    }
    setVisited(seen);
  }, [currentId]);

  if (visited === null) return null; // avoid hydration mismatch
  const next = surfaces.find((s) => !visited.includes(s.id));
  const count = surfaces.filter((s) => visited.includes(s.id)).length;

  return (
    <div className="bh-explore" aria-label="Surfaces explored">
      <span className="bh-explore__pips" aria-hidden>
        {surfaces.map((s) => (
          <span
            key={s.id}
            className={`bh-explore__pip${visited.includes(s.id) ? " is-visited" : ""}`}
            title={s.label}
          />
        ))}
      </span>
      <span>
        {count} of {surfaces.length} surfaces explored
        {next && (
          <>
            {" "}
            · next: <a href={next.href}>{next.label} →</a>
          </>
        )}
        {!next && ". The whole loop, end to end."}
      </span>
    </div>
  );
}
