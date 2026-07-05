import "./arena.css";
import { PageHeader } from "@synthaembed/ui-fleet";
import { listDecks } from "./decks";
import { ArenaClientShell } from "./ArenaClientShell";

export const metadata = {
  title: "Shapley Arena — dumbmodel.com",
  description:
    "Predict-first taste game: eight rounds of this-or-that with honest Shapley explanations from the real Rank Engine.",
};

export default function ArenaPage() {
  const decks = listDecks();

  return (
    <>
      <PageHeader
        eyebrow="Shapley Arena"
        title="Can we guess your taste?"
        lead="Eight rounds: model predicts, you pick, Shapley explains. Real rank math — no decorative numbers."
      />
      <ArenaClientShell decks={decks} />
    </>
  );
}
