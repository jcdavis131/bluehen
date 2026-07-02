"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ProgressMeter — progress toward a measured target (generalized from
 * dumbmodel's DumbnessMeter). Every number rendered comes from the
 * caller; nothing is invented here. Typical uses: effective rank / nDCG
 * vs the deploy gate (Spec 0008), budget burn-down.
 *
 * Attention details (motion-safe): the fill animates from zero on first
 * scroll into view (goal-gradient made visible); crossing the target on
 * a live update flashes the track once.
 */
export function ProgressMeter({
  label,
  value,
  max,
  target,
  targetLabel,
  digits = 0,
  prefix = "",
  suffix = "",
  tone = "accent",
  direction = "higher-better",
}: {
  label: string;
  value: number;
  max: number;
  /** Threshold marker (e.g. the deploy gate). */
  target?: number;
  targetLabel?: string;
  /** Serializable formatting (functions cannot cross the RSC boundary). */
  digits?: number;
  prefix?: string;
  suffix?: string;
  tone?: "accent" | "moss" | "clay" | "danger";
  /** For burn-down meters pass "lower-better" — passing the target flags instead of clearing. */
  direction?: "higher-better" | "lower-better";
}) {
  const format = (v: number) => `${prefix}${v.toFixed(digits)}${suffix}`;
  const clamped = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  const targetPct = target != null && max > 0 ? Math.max(0, Math.min(1, target / max)) : null;
  const cleared =
    target != null &&
    (direction === "higher-better" ? value >= target : value <= target);

  const trackRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  const [flash, setFlash] = useState(false);
  const prevCleared = useRef<boolean | null>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEntered(true);
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        // next frame so the 0-width state paints first, then transitions up
        requestAnimationFrame(() => setEntered(true));
        obs.disconnect();
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (prevCleared.current === false && cleared) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1200);
      return () => clearTimeout(t);
    }
    prevCleared.current = cleared;
  }, [cleared]);

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
        ref={trackRef}
        className={`bh-meter__track${flash ? " is-cleared-flash" : ""}`}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div
          className={`bh-meter__fill${entered ? "" : " is-entering"}`}
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
