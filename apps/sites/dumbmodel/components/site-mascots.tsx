/** Mascots + meter now live in @synthaembed/ui-fleet (shared, not
 * forked). This module keeps dumbmodel's local names/API stable. */

import { ProgressMeter } from "@synthaembed/ui-fleet";

export { ConeMascot, HenMascot } from "@synthaembed/ui-fleet";

export function DumbnessMeter({ score, label }: { score: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <ProgressMeter
      label="Dumbness Score"
      value={clamped}
      max={100}
      tone={clamped >= 60 ? "danger" : clamped >= 30 ? "clay" : "moss"}
      direction="lower-better"
      format={(v) => `${v.toFixed(0)}${label ? ` · ${label}` : ""}`}
    />
  );
}
