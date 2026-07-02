"use client";

/**
 * ProgressMeter — progress toward a measured target (generalized from
 * dumbmodel's DumbnessMeter). Every number rendered comes from the
 * caller; nothing is invented here. Typical uses: effective rank / nDCG
 * vs the deploy gate (Spec 0008), budget burn-down.
 */
export function ProgressMeter({
  label,
  value,
  max,
  target,
  targetLabel,
  format = (v) => String(v),
  tone = "accent",
  direction = "higher-better",
}: {
  label: string;
  value: number;
  max: number;
  /** Threshold marker (e.g. the deploy gate). */
  target?: number;
  targetLabel?: string;
  format?: (v: number) => string;
  tone?: "accent" | "moss" | "clay" | "danger";
  /** For burn-down meters pass "lower-better" — passing the target flags instead of clearing. */
  direction?: "higher-better" | "lower-better";
}) {
  const clamped = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  const targetPct = target != null && max > 0 ? Math.max(0, Math.min(1, target / max)) : null;
  const cleared =
    target != null &&
    (direction === "higher-better" ? value >= target : value <= target);

  const toneVar = {
    accent: "var(--bh-accent)",
    moss: "var(--bh-moss)",
    clay: "var(--bh-clay)",
    danger: "var(--bh-danger)",
  }[tone];

  return (
    <div className="bh-meter">
      <div className="bh-meter__head">
        <span className="bh-label">{label}</span>
        <span className="bh-mono bh-meter__value">
          {format(value)}
          {target != null && (
            <span className={`bh-meter__gate${cleared ? " is-cleared" : ""}`}>
              {" "}
              · {targetLabel ?? "gate"} {format(target)}
              {cleared ? " ✓" : ""}
            </span>
          )}
        </span>
      </div>
      <div
        className="bh-meter__track"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div
          className="bh-meter__fill"
          style={{ width: `${clamped * 100}%`, background: toneVar }}
        />
        {targetPct != null && (
          <span
            className="bh-meter__tick"
            style={{ left: `${targetPct * 100}%` }}
            title={`${targetLabel ?? "gate"}: ${format(target!)}`}
          />
        )}
      </div>
    </div>
  );
}
