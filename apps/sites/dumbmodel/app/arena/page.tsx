import "./arena.css";
import { PageHeader } from "@synthaembed/ui-fleet";
import { listDecks } from "./decks";
import { ArenaClient } from "./ArenaClient";

export const metadata = {
  title: "Rank Arena — dumbmodel.com",
  description:
    "Rank Anything. Fantasy Everything. Pick a deck, play twelve rounds of this-or-that, and get your personalized ranking from the real Rank Engine.",
};

export default function ArenaPage() {
  const decks = listDecks();

  return (
    <>
      <PageHeader
        eyebrow="Rank Anything. Fantasy Everything."
        title="Rank Arena"
        lead="Pick a deck, play twelve rounds of this-or-that, and the Rank Engine builds your personalized ranking — with the factors behind every position. Real machinery, no pretend."
      />
      <ArenaClient decks={decks} />
    </>
  );
}
