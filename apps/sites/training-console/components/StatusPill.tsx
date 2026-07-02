import type { RunStatus } from "../lib/types";

const LABELS: Record<string, string> = {
  running: "Running",
  finished: "Finished",
  failed: "Failed",
};

export function StatusPill({ status }: { status: RunStatus }) {
  // Unknown statuses (crashed, queued, …) render neutrally — never as a
  // green "Finished", which would invert the health signal.
  const known = status in LABELS ? status : "unknown";
  return (
    <span className={`status-pill status-pill--${known}`}>
      <span className="status-pill__dot" aria-hidden />
      {LABELS[status] ?? status}
    </span>
  );
}
