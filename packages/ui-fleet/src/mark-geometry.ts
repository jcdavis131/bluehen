/**
 * Fleet emblem geometry — single source of truth.
 *
 * One monoline pictogram per surface, drawn stroke-first in a 64×64 grid
 * with a shared line weight, round caps and joins — so the eight marks read
 * as one professional family (crest register, not cartoon register).
 * Consumed by marks.tsx (React, currentColor) and
 * scripts/generate_site_icons.mjs (static favicon SVGs).
 */

export type EmblemShape =
  /** stroked path */
  | { t: "p"; d: string }
  /** filled path (droplets, finials) */
  | { t: "pf"; d: string }
  /** filled path, evenodd — subpaths punch true holes (the hen's eye) */
  | { t: "pe"; d: string }
  /** stroked circle */
  | { t: "c"; cx: number; cy: number; r: number }
  /** filled circle (eyes, dots) */
  | { t: "cf"; cx: number; cy: number; r: number };

/** Shared monoline weight in the 64-grid. */
export const EMBLEM_STROKE = 3.5;

/** The Blue Hen — company mark (storefront + fallback). Solid silhouette
 * (like the reference crest's filled rackets): head in profile with comb,
 * beak, and pedestal, eye punched as a true hole so the mark sits on any
 * background in one color. The instruments stay monoline; the living
 * figure carries weight. */
const hen: EmblemShape[] = [
  {
    t: "pe",
    d:
      // head
      "M18 33 C18 24 24 19 31 19 C39 19 47 25 47 33 C47 40 41 45 33 45 C24 45 18 41 18 33 Z " +
      // comb — three bumps
      "M25 20 L26 14 L29 18 L31 12 L33 17 L35 13 L37 19 Z " +
      // beak
      "M46 30 L55 32 L46 35 Z " +
      // neck pedestal
      "M22 47 L36 47 L39 58 L19 58 Z " +
      // eye — hole via evenodd
      "M35.6 31 A2.6 2.6 0 1 1 30.4 31 A2.6 2.6 0 1 1 35.6 31 Z",
  },
];

/** Headquarters — command pennant. */
const pennant: EmblemShape[] = [
  { t: "p", d: "M22 12 L22 52" },
  { t: "p", d: "M22 14.5 L45 21 L22 27.5 Z" },
  { t: "p", d: "M15 52 L29 52" },
  { t: "cf", cx: 22, cy: 11, r: 1.9 },
];

/** Validation Lab — the referee's balance. */
const scale: EmblemShape[] = [
  { t: "cf", cx: 32, cy: 13.5, r: 1.9 },
  { t: "p", d: "M32 13.5 L32 50.5" },
  { t: "p", d: "M18 19.5 L46 19.5" },
  { t: "p", d: "M18 19.5 L13 31 M18 19.5 L23 31" },
  { t: "p", d: "M12 31 A6.8 6.8 0 0 0 24 31" },
  { t: "p", d: "M46 19.5 L41 31 M46 19.5 L51 31" },
  { t: "p", d: "M40 31 A6.8 6.8 0 0 0 52 31" },
  { t: "p", d: "M24 50.5 L40 50.5" },
];

/** Applied Research — the open book. */
const book: EmblemShape[] = [
  { t: "p", d: "M32 19 L32 46" },
  { t: "p", d: "M32 20.5 C27 16.5 19 16 14.5 18 L14.5 43.5 C19 41.5 27 42 32 46" },
  { t: "p", d: "M32 20.5 C37 16.5 45 16 49.5 18 L49.5 43.5 C45 41.5 37 42 32 46" },
];

/** dumbmodel — the traffic cone, monoline. */
const cone: EmblemShape[] = [
  { t: "p", d: "M32 11.5 L45.5 46 L18.5 46 Z" },
  { t: "p", d: "M25 29.5 L39 29.5" },
  { t: "p", d: "M22 38 L42 38" },
  { t: "p", d: "M12.5 52 L51.5 52" },
];

/** Simulation Lab — market signal, twin waves. */
const waves: EmblemShape[] = [
  { t: "p", d: "M11 26 C17 16.5 25 16.5 32 26 C39 35.5 47 35.5 53 26" },
  { t: "p", d: "M11 40 C17 30.5 25 30.5 32 40 C39 49.5 47 49.5 53 40" },
];

/** Observatory — telemetry dome under a fixed star. */
const dome: EmblemShape[] = [
  { t: "p", d: "M13.5 39 A18.5 18.5 0 0 1 50.5 39" },
  { t: "p", d: "M34.5 21.5 L42 39" },
  { t: "p", d: "M9 39 L55 39" },
  { t: "p", d: "M17 39 L17 50 L47 50 L47 39" },
  { t: "p", d: "M51 12.5 L51 19 M47.75 15.75 L54.25 15.75" },
];

/** Data Refinery — the funnel, raw material worked. */
const funnel: EmblemShape[] = [
  { t: "p", d: "M17.5 15.5 L46.5 15.5 L36 30 L36 45 L28 49 L28 30 Z" },
  { t: "pf", d: "M32 52.5 C29.8 55.8 30 58.5 32 58.5 C34 58.5 34.2 55.8 32 52.5 Z" },
];

export const SITE_EMBLEMS: Record<string, EmblemShape[]> = {
  storefront: hen,
  hq: pennant,
  validation: scale,
  research: book,
  dumbmodel: cone,
  simulation: waves,
  observatory: dome,
  refinery: funnel,
};

/** Company fallback for unknown site ids. */
export const DEFAULT_EMBLEM = hen;
