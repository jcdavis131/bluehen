/**
 * The Overworld (Spec 0033 V0) — a 4-tone, Game-Boy-INSPIRED palette.
 * Quantized from the Validation Lab's own certification-green accent
 * (--bh-moss / --bh-moss-dim in packages/ui-fleet/src/tokens.css), never
 * from a borrowed console palette. Fixed hex, not CSS vars: canvas pixels
 * need literal RGB at draw time, and the world should read the same
 * regardless of the site's light/dark theme toggle (an original handheld
 * always looked like itself, whatever room you played it in).
 */
export const PALETTE = {
  /** Deepest shade — outlines, night-side detail, door slabs. */
  darkest: "#12241a",
  /** Base shade — grass, water, trunks, wall trim. */
  dark: "#2b4f38",
  /** Mid shade — path stone, canopy highlight, screen glow. */
  mid: "#6b9c6d",
  /** Lightest shade — signage, screens, worn stone, foam. */
  light: "#dcefc8",
} as const;

export type Tone = keyof typeof PALETTE;

/** Logical tile edge, in source pixels, before integer scaling. */
export const TILE_SIZE = 16;
