"use client";

import { useEffect, useState } from "react";

/** Modernized TUI top status bar — `site · section · status · time` in IBM
 *  Plex Mono, hairline border, on the elevated canvas. Renders a stable
 *  initial stamp to avoid hydration mismatch, then ticks each minute. */
export function StatusLine({
  site,
  section,
  status,
  time: timeProp,
  className,
}: {
  site: string;
  section: string;
  status: string;
  /** Override the clock (e.g. for tests or SSR-stable snapshots). */
  time?: string;
  className?: string;
}) {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const time = timeProp ?? now ?? "--:--";

  return (
    <div
      className={`bh-status-line${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="bh-status-line__seg">{site}</span>
      <span className="bh-status-line__sep" aria-hidden="true">
        ·
      </span>
      <span className="bh-status-line__seg">{section}</span>
      <span className="bh-status-line__sep" aria-hidden="true">
        ·
      </span>
      <span className="bh-status-line__seg bh-status-line__status">
        {status}
      </span>
      <span className="bh-status-line__time">{time}</span>
    </div>
  );
}
