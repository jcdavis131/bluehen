import Link from "next/link";
import {
  Axis,
  PageHeader,
  RuledSection,
  StatusLine,
} from "@synthaembed/ui-fleet";
import { listDecks } from "./arena/decks";

export const metadata = {
  title: "Can we guess your taste?",
  description:
    "Shapley Arena on dumbmodel.com — predict-first taste game with honest Shapley explanations after every round.",
};

export default function HomePage() {
  const decks = listDecks();

  return (
    <>
      <StatusLine site="dumbmodel.com" section="Shapley Arena" status="Play now" />

      <Axis>
        <PageHeader
          eyebrow="Rank Anything · Fantasy Everything"
          title="Can we guess your taste?"
          lead="Pick a deck, play eight rounds of this-or-that. Before each pick the model predicts your choice — then shows exactly why, with Shapley values from the real Rank Engine."
        />

        <RuledSection label="Decks">
          <div className="arena-deck-grid">
            {decks.map((deck) => (
              <Link
                key={deck.slug}
                href={`/arena?deck=${deck.slug}`}
                className="arena-deck-card"
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
              >
                <h3>{deck.name}</h3>
                <p>{deck.tagline}</p>
                <span className="arena-deck-count">{deck.items.length} items · 8 rounds</span>
              </Link>
            ))}
          </div>
        </RuledSection>

        <RuledSection label="Play">
          <Link href="/arena" className="bh-btn bh-btn--primary bh-btn--hero">
            Play now
          </Link>
          <p className="bh-muted" style={{ marginTop: 12 }}>
            Proof tools — health check, compare, museum — live under{" "}
            <Link href="/lab">/lab</Link>.
          </p>
        </RuledSection>
      </Axis>
    </>
  );
}
