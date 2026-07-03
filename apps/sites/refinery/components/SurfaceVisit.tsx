"use client";

import { useEffect } from "react";

// Shared with ui-fleet's ExplorationTracker — same key, same JSON string[]
// format, so the homepage tracker reflects pages actually opened.
const STORAGE_KEY = "bh-explored-surfaces";

/** UX-120 (Spec 0020): records this surface into the device-local
 * exploration ledger (localStorage only — no accounts, no server) so the
 * homepage ExplorationTracker shows real visits, not just the homepage
 * marking itself. Renders nothing. */
export function SurfaceVisit({ id }: { id: string }) {
  useEffect(() => {
    try {
      const seen = JSON.parse(
        localStorage.getItem(STORAGE_KEY) ?? "[]",
      ) as string[];
      if (!seen.includes(id)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen, id]));
      }
    } catch {
      // storage unavailable — exploration stays untracked
    }
  }, [id]);
  return null;
}
