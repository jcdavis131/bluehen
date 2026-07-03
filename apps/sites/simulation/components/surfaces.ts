import type { ExplorationSurface } from "@synthaembed/ui-fleet";
import marketPlatforms from "../../../../config/market-platforms.json";

/** Exploration-tracker scope (UX-120, Spec 0020): signals.bhenre.com surfaces
 * only — localStorage is per-origin, so claiming cross-site visits would be
 * dishonest. Derived from the same platform registry the simulator enforces,
 * so the list cannot drift from the actual /simulate/[platform] routes. */
export const SIM_SURFACES: ExplorationSurface[] = [
  { id: "home", label: "Simulation Lab", href: "/" },
  ...(marketPlatforms.platforms as { id: string; name: string }[]).map((p) => ({
    id: p.id,
    label: `${p.name} simulation`,
    href: `/simulate/${p.id}`,
  })),
];
