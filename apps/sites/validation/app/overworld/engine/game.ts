import { SOLID_TILES, TILE_SIZE, type Facing } from "./tiles";
import { MAP_H, MAP_W, tileAt } from "./map";

export { TILE_SIZE };
export type { Facing };

/** Tiles visible at once — a small GB-style window, camera-scrolled. */
export const VIEW_W = 15;
export const VIEW_H = 11;

/** Milliseconds for one tile-to-tile step. */
export const MOVE_DURATION_MS = 150;

export type Direction = "up" | "down" | "left" | "right";

const DELTA: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export type PlayerState = {
  x: number;
  y: number;
  facing: Facing;
  moving: boolean;
  fromX: number;
  fromY: number;
  moveElapsed: number;
  walkFrame: 0 | 1;
};

export function isSolid(x: number, y: number): boolean {
  return SOLID_TILES.has(tileAt(x, y));
}

/** Begin a step in `dir` if the target tile is walkable, else just turn
 * to face it. Returns a new state (never mutates). No-op while mid-move. */
export function tryMove(state: PlayerState, dir: Direction): PlayerState {
  if (state.moving) return state;
  const { dx, dy } = DELTA[dir];
  const nx = state.x + dx;
  const ny = state.y + dy;
  if (isSolid(nx, ny) || nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) {
    return { ...state, facing: dir };
  }
  return {
    ...state,
    facing: dir,
    moving: true,
    fromX: state.x,
    fromY: state.y,
    x: nx,
    y: ny,
    moveElapsed: 0,
  };
}

/** Advance the current move animation by `dtMs`. Flips the walk frame at
 * the midpoint and completes the step once the duration elapses. */
export function advanceMove(state: PlayerState, dtMs: number): PlayerState {
  if (!state.moving) return state;
  const elapsed = state.moveElapsed + dtMs;
  if (elapsed >= MOVE_DURATION_MS) {
    return { ...state, moving: false, moveElapsed: 0, walkFrame: state.walkFrame === 0 ? 1 : 0 };
  }
  return { ...state, moveElapsed: elapsed };
}

/** Interpolated render position, in tile units (fractional while moving). */
export function renderPosition(state: PlayerState): { rx: number; ry: number } {
  if (!state.moving) return { rx: state.x, ry: state.y };
  const t = Math.min(1, state.moveElapsed / MOVE_DURATION_MS);
  return {
    rx: state.fromX + (state.x - state.fromX) * t,
    ry: state.fromY + (state.y - state.fromY) * t,
  };
}

/** Tile the player is facing (for interaction lookups). */
export function facingTile(state: PlayerState): { x: number; y: number } {
  const { dx, dy } = DELTA[state.facing];
  return { x: state.x + dx, y: state.y + dy };
}

/** Camera top-left tile offset, centered on the player and clamped to
 * the map bounds so the view never scrolls past the water border. */
export function cameraOffset(rx: number, ry: number): { camX: number; camY: number } {
  const rawX = rx - (VIEW_W - 1) / 2;
  const rawY = ry - (VIEW_H - 1) / 2;
  const camX = Math.min(Math.max(rawX, 0), MAP_W - VIEW_W);
  const camY = Math.min(Math.max(rawY, 0), MAP_H - VIEW_H);
  return { camX, camY };
}

export function initialPlayerState(x: number, y: number, facing: Facing): PlayerState {
  return { x, y, facing, moving: false, fromX: x, fromY: y, moveElapsed: 0, walkFrame: 0 };
}
