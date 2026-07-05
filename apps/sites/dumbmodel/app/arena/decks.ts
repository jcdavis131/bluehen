/**
 * Rank Arena deck data (Spec 0029 §4). Decks are checked into
 * content/arena/decks/*.json — statically imported (resolveJsonModule)
 * so they're bundled at build time on Vercel and in local dev alike.
 * Server-safe: no "use client" here, imported by both the arena page
 * (SSR) and the /api/arena/decks BFF route.
 */
import movieNight from "../../../../../content/arena/decks/movie-night.json";
import streetFood from "../../../../../content/arena/decks/street-food.json";
import fictionalVillains from "../../../../../content/arena/decks/fictional-villains.json";
import gadgets from "../../../../../content/arena/decks/gadgets.json";
import newsWeek from "../../../../../content/arena/decks/news-week-2026-07.json";

export type ArenaItem = {
  id: string;
  text: string;
};

export type ArenaDeck = {
  slug: string;
  name: string;
  tagline: string;
  items: ArenaItem[];
};

const DECKS: ArenaDeck[] = [
  movieNight,
  streetFood,
  fictionalVillains,
  gadgets,
  newsWeek,
] as ArenaDeck[];

export function listDecks(): ArenaDeck[] {
  return DECKS;
}

export function getDeck(slug: string): ArenaDeck | undefined {
  return DECKS.find((d) => d.slug === slug);
}
