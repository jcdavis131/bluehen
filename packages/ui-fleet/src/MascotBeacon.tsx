"use client";

import { useEffect, useState } from "react";
import { HenMascot } from "./mascots";

/** The mascot watches the visitor's pointer, a small "you are seen" beat.
 * Falls back to a fixed gaze (e.g. toward the active division) when the
 * pointer is idle, on touch devices, or under reduced motion. Max one per
 * page. The gaze shifts via a CSS transform on the eye group inside
 * HenMascot, so it transitions consistently across browsers. */
export function MascotBeacon({
  size = 36,
  restingGaze = 0,
}: {
  size?: number;
  restingGaze?: number;
}) {
  const [gaze, setGaze] = useState(restingGaze);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    let idle: ReturnType<typeof setTimeout>;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setGaze((e.clientX / window.innerWidth) * 2 - 1);
      });
      clearTimeout(idle);
      idle = setTimeout(() => setGaze(restingGaze), 2500);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      clearTimeout(idle);
      cancelAnimationFrame(raf);
    };
  }, [restingGaze]);

  return <HenMascot size={size} gaze={gaze} />;
}
