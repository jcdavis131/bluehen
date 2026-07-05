import type { Facing } from "./tiles";
import { SPAWN } from "./map";

const POSITION_KEY = "overworld-player-position";
const USER_REF_KEY = "overworld-user-ref";
const VISITED_KEY = "overworld-visited";

export type SavedPosition = { x: number; y: number; facing: Facing };

/** Position persists across visits (localStorage); the session-scoped
 * user ref and one-time visit flag reset per tab session, same pattern
 * as the Verdict client. */
export function loadPosition(): SavedPosition {
  if (typeof window === "undefined") return { ...SPAWN };
  try {
    const raw = window.localStorage.getItem(POSITION_KEY);
    if (!raw) return { ...SPAWN };
    const parsed = JSON.parse(raw) as Partial<SavedPosition>;
    if (typeof parsed.x === "number" && typeof parsed.y === "number" && typeof parsed.facing === "string") {
      return { x: parsed.x, y: parsed.y, facing: parsed.facing as Facing };
    }
    return { ...SPAWN };
  } catch {
    return { ...SPAWN };
  }
}

export function savePosition(pos: SavedPosition) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(POSITION_KEY, JSON.stringify(pos));
  } catch {
    // localStorage unavailable (private mode etc.) — position just won't
    // persist across reloads; the session itself still works.
  }
}

export function readOrCreateUserRef(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.sessionStorage.getItem(USER_REF_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID().slice(0, 12);
    window.sessionStorage.setItem(USER_REF_KEY, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID().slice(0, 12);
  }
}

export function hasVisitedThisSession(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(VISITED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markVisitedThisSession() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(VISITED_KEY, "1");
  } catch {
    // best-effort only
  }
}
