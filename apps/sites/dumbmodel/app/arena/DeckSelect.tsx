"use client";

import type { ArenaDeck } from "./decks";

/** Deck select screen (Spec 0029 §4 step 1): three cards + the consent
 * line, exact copy from spec. Picking a card starts the gauntlet — no
 * separate checkbox, the copy itself is the opt-in ("skip if not cool"). */
export function DeckSelect({
  decks,
  onSelect,
}: {
  decks: ArenaDeck[];
  onSelect: (deck: ArenaDeck) => void;
}) {
  return (
    <div>
      <p className="arena-consent">
        Your picks are stored anonymously (a random session id, no account) to
        build your ranking and improve the platform. Skip the Arena if that's
        not cool.
      </p>
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
            <span className="arena-deck-count">{deck.items.length} items</span>
          </button>
        ))}
      </div>
    </div>
  );
}
