import "./arena.css";
import { PageHeader } from "@synthaembed/ui-fleet";
import { listDecks } from "./decks";
import { ArenaClientShell } from "./ArenaClientShell";

export const metadata = {
  title: "Blind Rank",
  description:
    "Rank anything blind: eight rapid head-to-heads, then your S-tier list drops. Real rank engine — shareable like the videos.",
};

export default function ArenaPage() {
  const decks = listDecks();

  return (
    <>
      <PageHeader
        eyebrow="Blind Rank"
        title="Rank it blind. See the tier list."
        lead="Pick a deck, slam through eight this-or-that picks, watch your S→D tier list drop at the end. We guess each pick out loud — then you send the list to someone who'll fight you on #1."
      />
      <ArenaClientShell decks={decks} />
    </>
  );
}
