import type { TileChar } from "./tiles";

/**
 * The Overworld map (Spec 0033 V0): six districts + the HQ tower, a
 * ~40x28 tile world, water-bordered. The grid is built once at module
 * load from explicit district bounding boxes (rather than hand-typed
 * ASCII) so dimensions and door placement stay provably consistent —
 * the result is frozen and consumed as a plain string-grid by the
 * renderer, same as a literal const would be.
 *
 * District layout (interior tile coordinates, x:1-38, y:1-26):
 *   HQ tower           center-N   x17-22 y2-7   (roof/wall/door, faces south)
 *   Storefront plaza   N          x3-36  y2-9   (open square around the tower)
 *   DumbModel arcade   E          x29-37 y10-19 (two cabinets off the spine)
 *   Refinery works     W          x3-7   y11-15 (roof/wall/door)
 *   Research library   S          x29-34 y21-25 (roof/wall/door, CLOSED sign)
 *   Courthouse         center-S   x16-23 y20-24 (roof/wall/door, links /verdict)
 *   Signals garden     SW         x2-13  y20-26 (open, fixture-labeled sign)
 */
export const MAP_W = 40;
export const MAP_H = 28;

export type InteractableKind = "sign" | "door" | "kiosk" | "board" | "cabinet";

export type Interactable = {
  id: string;
  x: number;
  y: number;
  kind: InteractableKind;
};

type Grid = string[][];

function blankGrid(): Grid {
  const g: Grid = [];
  for (let y = 0; y < MAP_H; y++) g.push(new Array<string>(MAP_W).fill("."));
  return g;
}

function hLine(g: Grid, x0: number, x1: number, y: number, ch: string) {
  for (let x = x0; x <= x1; x++) g[y][x] = ch;
}

function vLine(g: Grid, x: number, y0: number, y1: number, ch: string) {
  for (let y = y0; y <= y1; y++) g[y][x] = ch;
}

/** A rectangular building facade: `roofRows` rows of roof at the top,
 * wall below, and a single door tile centered on the bottom row (the
 * side every building here is approached from). */
function building(g: Grid, x0: number, x1: number, y0: number, y1: number, roofRows: number, doorX: number) {
  for (let r = 0; r < roofRows; r++) hLine(g, x0, x1, y0 + r, "r");
  for (let y = y0 + roofRows; y < y1; y++) hLine(g, x0, x1, y, "w");
  hLine(g, x0, x1, y1, "w");
  g[y1][doorX] = "d";
}

function build(): { rows: readonly string[]; interactables: readonly Interactable[] } {
  const g = blankGrid();
  const interactables: Interactable[] = [];

  // Water border.
  hLine(g, 0, MAP_W - 1, 0, "~");
  hLine(g, 0, MAP_W - 1, MAP_H - 1, "~");
  vLine(g, 0, 0, MAP_H - 1, "~");
  vLine(g, MAP_W - 1, 0, MAP_H - 1, "~");

  // ── Spines ────────────────────────────────────────────────────
  // Vertical: HQ door (19,7) down to the courthouse approach corridor.
  vLine(g, 19, 8, 19, "p");
  // Horizontal: refinery east edge to arcade west edge, crossing the spine.
  hLine(g, 8, 30, 13, "p");

  // ── HQ tower (center-N) ──────────────────────────────────────
  building(g, 17, 22, 2, 7, 2, 19);
  g[9][20] = "k";
  interactables.push({ id: "door-hq", x: 19, y: 7, kind: "door" });
  interactables.push({ id: "kiosk-hq", x: 20, y: 9, kind: "kiosk" });

  // ── Storefront plaza (N, open square around the tower) ───────
  g[6][10] = "b";
  g[6][28] = "g";
  interactables.push({ id: "board-plaza", x: 10, y: 6, kind: "board" });
  interactables.push({ id: "sign-storefront", x: 28, y: 6, kind: "sign" });

  // ── DumbModel arcade (E) — two cabinet buildings off the spine ─
  hLine(g, 33, 33, 12, "r");
  g[13][33] = "c";
  hLine(g, 35, 35, 12, "r");
  g[13][35] = "c";
  interactables.push({ id: "cabinet-beat", x: 33, y: 13, kind: "cabinet" });
  interactables.push({ id: "cabinet-arena", x: 35, y: 13, kind: "cabinet" });
  g[16][31] = "g";
  interactables.push({ id: "sign-dumbmodel", x: 31, y: 16, kind: "sign" });

  // ── Refinery works (W) ────────────────────────────────────────
  building(g, 3, 7, 11, 15, 1, 5);
  vLine(g, 8, 14, 16, "p");
  hLine(g, 5, 8, 16, "p");
  g[17][3] = "g";
  interactables.push({ id: "door-refinery", x: 5, y: 15, kind: "door" });
  interactables.push({ id: "sign-refinery", x: 3, y: 17, kind: "sign" });

  // ── Signals garden (SW) — open plot, a few trees, fixture note ─
  g[21][4] = "t";
  g[21][11] = "t";
  g[25][4] = "t";
  g[25][11] = "t";
  g[23][7] = "g";
  interactables.push({ id: "sign-signals", x: 7, y: 23, kind: "sign" });

  // ── Courthouse (center-S) — wraparound approach from the south ─
  building(g, 16, 23, 20, 24, 2, 19);
  hLine(g, 14, 19, 19, "p");
  vLine(g, 14, 19, 25, "p");
  hLine(g, 14, 19, 25, "p");
  interactables.push({ id: "door-courthouse", x: 19, y: 24, kind: "door" });

  // ── Research library (S) — CLOSED, worldbook terminal on record ─
  // Sign and kiosk sit outside the building's own footprint (not flanking
  // the door's approach tile) so the one-tile-wide corridor in front of
  // the door stays open rather than boxed in by two solid objects.
  building(g, 29, 34, 21, 25, 1, 31);
  g[26][36] = "k";
  g[26][27] = "g";
  interactables.push({ id: "door-library", x: 31, y: 25, kind: "door" });
  interactables.push({ id: "kiosk-library", x: 36, y: 26, kind: "kiosk" });
  interactables.push({ id: "sign-library", x: 27, y: 26, kind: "sign" });

  const rows = g.map((row) => row.join(""));
  return { rows, interactables };
}

const built = build();

/** The frozen world grid — one char per tile, row-major. */
export const MAP: readonly string[] = Object.freeze(built.rows);

/** All facing-interactable objects in the world, keyed by tile position. */
export const INTERACTABLES: readonly Interactable[] = Object.freeze(built.interactables);

const interactableByPos = new Map<string, Interactable>(
  INTERACTABLES.map((i) => [`${i.x},${i.y}`, i]),
);

export function interactableAt(x: number, y: number): Interactable | undefined {
  return interactableByPos.get(`${x},${y}`);
}

export function tileAt(x: number, y: number): TileChar {
  if (y < 0 || y >= MAP_H || x < 0 || x >= MAP_W) return "~";
  return (MAP[y]?.[x] as TileChar) ?? ".";
}

/** Spawn point: the north-center crossroads just south of HQ, on record
 * as the world's "front door" — open, walkable, one tile from the spine. */
export const SPAWN = { x: 19, y: 10, facing: "down" as const };
