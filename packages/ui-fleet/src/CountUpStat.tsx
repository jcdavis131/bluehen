"use client";

import { useEffect, useRef, useState } from "react";

/** Count-up number: animates from 0 when scrolled into view, once.
 * Honors prefers-reduced-motion (renders the final value immediately). */
export function CountUpStat({
  value,
  digits = 0,
  prefix = "",
  suffix = "",
  durationMs = 700,
  className,
}: {
  value: number;
  /** Serializable formatting (functions cannot cross the RSC boundary). */
  digits?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
}) {
  const format = (v: number) => `${prefix}${v.toFixed(digits)}${suffix}`;
  const ref = useRef<HTMLSpanElement>(null);
  // SSR/no-JS shows the REAL value (UX-101: '0 active/$0' pre-hydration was
  // the org's worst first impression); the count-up is progressive polish.
  const [display, setDisplay] = useState<number>(value);
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !Number.isFinite(value)) {
      setDisplay(value);
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || animated.current) return;
      animated.current = true;
      observer.disconnect();
      const start = performance.now();
      const from = value * 0.6; // never dip to 0 after SSR showed the truth
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(from + (value - from) * eased);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className={className}>
      {format(display)}
    </span>
  );
}
