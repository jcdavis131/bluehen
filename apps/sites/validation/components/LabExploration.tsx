import { ExplorationTracker, type ExplorationSurface } from "@synthaembed/ui-fleet";

// Exploration tracker scope: slasso.com pages only (localStorage is
// per-origin — claiming cross-site visits would be dishonest). /queue is
// deliberately de-navved (UX-104) and stays out of the exploration goal.
export const LAB_SURFACES: ExplorationSurface[] = [
  { id: "home", label: "Benchmark Overview", href: "/" },
  { id: "certify", label: "Get Certified", href: "/certify" },
  { id: "try", label: "Run Benchmark", href: "/try" },
  { id: "scorecards", label: "Scorecards", href: "/scorecards" },
  { id: "feedback", label: "Feedback", href: "/feedback" },
];

/** Spec 0020 UX-120 — renders on every lab surface so visits are actually
 * recorded (the tracker only marks pages where it mounts); progress shown
 * is real localStorage state, never decorative. */
export function LabExploration({ currentId }: { currentId: string }) {
  return <ExplorationTracker surfaces={LAB_SURFACES} currentId={currentId} />;
}
