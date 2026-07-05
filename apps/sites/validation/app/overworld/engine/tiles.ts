import { PALETTE, TILE_SIZE } from "./palette";

export { TILE_SIZE };

/**
 * Tile legend (Spec 0033 V0). One char per logical tile in the map grid
 * (engine/map.ts). Every tile below is drawn procedurally in code —
 * no image files, no borrowed art.
 */
export type TileChar =
  | "." // grass
  | "p" // path
  | "~" // water (2-frame shimmer)
  | "t" // tree
  | "w" // building wall
  | "r" // building roof
  | "d" // door (interactable)
  | "g" // signpost (interactable)
  | "k" // worldbook terminal / kiosk (interactable)
  | "b" // happenings board (interactable)
  | "c"; // arcade cabinet (interactable)

/** Tile chars that block player movement. Everything else is walkable. */
export const SOLID_TILES: ReadonlySet<TileChar> = new Set([
  "~",
  "t",
  "w",
  "r",
  "d",
  "g",
  "k",
  "b",
  "c",
]);

function fill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

const S = TILE_SIZE; // 16
const U = S / 8; // 2px "chunk" — the grain of the pixel art

/** Deterministic pseudo-noise so grass/path speckle looks hand-placed
 * but never flickers frame to frame (seeded by tile coordinate). */
function noise(seedX: number, seedY: number, salt: number): number {
  const v = Math.sin(seedX * 127.1 + seedY * 311.7 + salt * 74.3) * 43758.5453;
  return v - Math.floor(v);
}

function drawGrass(ctx: CanvasRenderingContext2D, ox: number, oy: number, tx: number, ty: number) {
  fill(ctx, ox, oy, S, S, PALETTE.dark);
  // scattered blade flecks, position seeded by tile coords so it's stable
  for (let i = 0; i < 3; i++) {
    const gx = Math.floor(noise(tx, ty, i) * 7);
    const gy = Math.floor(noise(tx, ty, i + 10) * 7);
    fill(ctx, ox + gx * U, oy + gy * U, U, U, i === 0 ? PALETTE.mid : PALETTE.darkest);
  }
}

function drawPath(ctx: CanvasRenderingContext2D, ox: number, oy: number, tx: number, ty: number) {
  fill(ctx, ox, oy, S, S, PALETTE.mid);
  for (let i = 0; i < 4; i++) {
    const gx = Math.floor(noise(tx, ty, i + 20) * 7);
    const gy = Math.floor(noise(tx, ty, i + 30) * 7);
    fill(ctx, ox + gx * U, oy + gy * U, U, U, i % 2 === 0 ? PALETTE.light : PALETTE.darkest);
  }
}

function drawWater(ctx: CanvasRenderingContext2D, ox: number, oy: number, frame: 0 | 1) {
  fill(ctx, ox, oy, S, S, PALETTE.dark);
  const rowOffset = frame === 0 ? 0 : U;
  for (let row = 0; row < 2; row++) {
    const y = oy + (row * 4 + 1) * U + rowOffset;
    fill(ctx, ox + U, y, S - 2 * U, U, PALETTE.mid);
  }
  fill(ctx, ox, oy, U, U, PALETTE.darkest);
  fill(ctx, ox + S - U, oy + S - U, U, U, PALETTE.darkest);
}

function drawTree(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  fill(ctx, ox, oy, S, S, PALETTE.dark);
  // trunk
  fill(ctx, ox + 3 * U, oy + 5 * U, 2 * U, 3 * U, PALETTE.darkest);
  // canopy
  fill(ctx, ox + U, oy, 6 * U, 5 * U, PALETTE.darkest);
  fill(ctx, ox + 2 * U, oy + U, 4 * U, 3 * U, PALETTE.mid);
}

function drawWall(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  fill(ctx, ox, oy, S, S, PALETTE.light);
  fill(ctx, ox, oy, S, U, PALETTE.darkest);
  fill(ctx, ox, oy + S - U, S, U, PALETTE.darkest);
  fill(ctx, ox, oy + 3 * U, S, U, PALETTE.dark);
  fill(ctx, ox, oy, U, S, PALETTE.darkest);
  fill(ctx, ox + S - U, oy, U, S, PALETTE.darkest);
}

function drawRoof(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  fill(ctx, ox, oy, S, S, PALETTE.dark);
  for (let row = 0; row < 4; row++) {
    fill(ctx, ox + row * U, oy + row * U, S - row * 2 * U, U, PALETTE.darkest);
  }
  fill(ctx, ox, oy + S - U, S, U, PALETTE.mid);
}

function drawDoor(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  fill(ctx, ox, oy, S, S, PALETTE.light);
  fill(ctx, ox + U, oy + U, S - 2 * U, S - U, PALETTE.darkest);
  fill(ctx, ox + S - 3 * U, oy + 4 * U, U, U, PALETTE.light);
}

function drawSign(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  fill(ctx, ox, oy, S, S, PALETTE.dark);
  fill(ctx, ox + 3 * U, oy + 4 * U, 2 * U, 4 * U, PALETTE.darkest);
  fill(ctx, ox + U, oy, 6 * U, 4 * U, PALETTE.light);
  fill(ctx, ox + U, oy, 6 * U, U, PALETTE.darkest);
  fill(ctx, ox + 2 * U, oy + 2 * U, 4 * U, U, PALETTE.darkest);
}

function drawKiosk(ctx: CanvasRenderingContext2D, ox: number, oy: number, frame: 0 | 1) {
  fill(ctx, ox, oy, S, S, PALETTE.dark);
  fill(ctx, ox + U, oy + U, 6 * U, 6 * U, PALETTE.darkest);
  fill(ctx, ox + 2 * U, oy + 2 * U, 4 * U, 3 * U, PALETTE.light);
  fill(ctx, ox + 2 * U, oy + (frame === 0 ? 2 : 3) * U, 4 * U, U, PALETTE.mid);
}

function drawBoard(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  fill(ctx, ox, oy, S, S, PALETTE.dark);
  fill(ctx, ox + U, oy + U, 6 * U, 6 * U, PALETTE.light);
  fill(ctx, ox + U, oy + U, 6 * U, U, PALETTE.darkest);
  for (let row = 0; row < 2; row++) {
    fill(ctx, ox + 2 * U, oy + (3 + row * 2) * U, 4 * U, U, row === 0 ? PALETTE.darkest : PALETTE.mid);
  }
}

function drawCabinet(ctx: CanvasRenderingContext2D, ox: number, oy: number, frame: 0 | 1) {
  fill(ctx, ox, oy, S, S, PALETTE.dark);
  fill(ctx, ox + U, oy, 6 * U, 7 * U, PALETTE.darkest);
  fill(ctx, ox + 2 * U, oy + U, 4 * U, 3 * U, frame === 0 ? PALETTE.light : PALETTE.mid);
  fill(ctx, ox + 2 * U, oy + 5 * U, U, U, PALETTE.light);
  fill(ctx, ox + 5 * U, oy + 5 * U, U, U, PALETTE.light);
}

/** Draw one logical tile at pixel origin (ox, oy). (tx, ty) are the tile's
 * grid coordinates (used only to seed stable per-tile speckle noise);
 * `frame` toggles the water shimmer / screen glow between two states. */
export function drawTile(
  ctx: CanvasRenderingContext2D,
  ch: TileChar,
  ox: number,
  oy: number,
  tx: number,
  ty: number,
  frame: 0 | 1,
) {
  switch (ch) {
    case ".":
      return drawGrass(ctx, ox, oy, tx, ty);
    case "p":
      return drawPath(ctx, ox, oy, tx, ty);
    case "~":
      return drawWater(ctx, ox, oy, frame);
    case "t":
      return drawTree(ctx, ox, oy);
    case "w":
      return drawWall(ctx, ox, oy);
    case "r":
      return drawRoof(ctx, ox, oy);
    case "d":
      return drawDoor(ctx, ox, oy);
    case "g":
      return drawSign(ctx, ox, oy);
    case "k":
      return drawKiosk(ctx, ox, oy, frame);
    case "b":
      return drawBoard(ctx, ox, oy);
    case "c":
      return drawCabinet(ctx, ox, oy, frame);
    default:
      return drawGrass(ctx, ox, oy, tx, ty);
  }
}

export type Facing = "down" | "up" | "left" | "right";

/** The player: a small procedural figure, 2-frame walk cycle, facing
 * indicated by a simple head/eye orientation rather than borrowed art. */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  facing: Facing,
  walkFrame: 0 | 1,
) {
  const legOffset = walkFrame === 0 ? 0 : U;
  // legs
  fill(ctx, ox + 3 * U, oy + 11 * U + legOffset, U, 2 * U, PALETTE.darkest);
  fill(ctx, ox + 5 * U, oy + 11 * U + (legOffset === 0 ? U : 0), U, 2 * U, PALETTE.darkest);
  // body
  fill(ctx, ox + 2 * U, oy + 6 * U, 5 * U, 5 * U, PALETTE.light);
  fill(ctx, ox + 2 * U, oy + 6 * U, 5 * U, U, PALETTE.mid);
  // head
  fill(ctx, ox + 2 * U, oy + 2 * U, 5 * U, 4 * U, PALETTE.light);
  fill(ctx, ox + 2 * U, oy + U, 5 * U, U, PALETTE.darkest);

  if (facing === "down") {
    fill(ctx, ox + 3 * U, oy + 4 * U, U, U, PALETTE.darkest);
    fill(ctx, ox + 5 * U, oy + 4 * U, U, U, PALETTE.darkest);
  } else if (facing === "up") {
    fill(ctx, ox + 2 * U, oy + 2 * U, 5 * U, 2 * U, PALETTE.darkest);
  } else if (facing === "left") {
    fill(ctx, ox + 2 * U, oy + 4 * U, U, U, PALETTE.darkest);
  } else {
    fill(ctx, ox + 6 * U, oy + 4 * U, U, U, PALETTE.darkest);
  }
}
