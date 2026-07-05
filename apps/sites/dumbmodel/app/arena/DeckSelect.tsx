"use client";

import type { ArenaDeck } from "./decks";

/** Pick a category — blind rank video setup screen. */
export function DeckSelect({
  decks,
  onSelect,
}: {
  decks: ArenaDeck[];
  onSelect: (deck: ArenaDeck) => void;
}) {
  return (
    <div>
      <p className="arena-blind-setup">
        Pick a category. Eight rapid head-to-heads. Tier list at the end — just like the videos.
      </p>
      <div className="arena-deck-grid">
        {decks.map((deck) => (
          <button
            key={deck.slug}
            type="button"
            className="arena-deck-card arena-deck-card--blind"
            onClick={() => onSelect(deck)}
          >
            <span className="arena-deck-blind-tag">Blind rank</span>
            <h3>{deck.name}</h3>
            <p>{deck.tagline}</p>
            <span className="arena-deck-count">{deck.items.length} items · 8 picks</span>
          </button>
        ))}
      </div>
    </div>
  );
}
