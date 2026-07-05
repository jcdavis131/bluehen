"use client";

import type { ArenaDeck } from "./decks";

/** Deck select (Spec 0032): pick a deck to start the 8-round gauntlet. */
export function DeckSelect({
  decks,
  onSelect,
}: {
  decks: ArenaDeck[];
  onSelect: (deck: ArenaDeck) => void;
}) {
  return (
    <div className="arena-deck-grid">
      {decks.map((deck) => (
        <button
          key={deck.slug}
          type="button"
          className="arena-deck-card"
          onClick={() => onSelect(deck)}
        >
          <h3>{deck.name}</h3>
          <p>{deck.tagline}</p>
          <span className="arena-deck-count">{deck.items.length} items · 8 rounds</span>
        </button>
      ))}
    </div>
  );
}
