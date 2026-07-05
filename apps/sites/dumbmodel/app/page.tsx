import Link from "next/link";
import "./arena/arena.css";
import {
  Axis,
  Marginalia,
  PageHeader,
  RuledSection,
  StatusLine,
} from "@synthaembed/ui-fleet";
import { listDecks } from "./arena/decks";

export const metadata = {
  title: "Arcade",
  description:
    "Blind Rank, Beat the Baseline, and your impact on the model — the dumbmodel arcade.",
};

const GAMES = [
  {
    href: "/beat",
    tag: "Adversarial",
    title: "Beat the Baseline",
    body: "Poison a query the baseline should answer — but doesn't. Every score is live.",
  },
  {
    href: "/impact",
    tag: "Metagame",
    title: "Your Impact",
    body: "Every pick and triplet you've logged — your dents in the model, honestly tallied.",
  },
];

export default function HomePage() {
  const decks = listDecks();

  return (
    <>
      <StatusLine site="dumbmodel.com" section="Arcade" status="Play now" />

      <Axis>
        <PageHeader
          eyebrow="Rank Anything · Fantasy Everything"
          title="Rank it blind. Break the baseline."
          lead="The viral blind-rank format lives here: pick a category, slam through eight head-to-heads, watch your tier list drop. We call our guess before each pick — then you share the list."
        />

        <RuledSection label="Blind Rank">
          <div className="arena-deck-grid">
            {decks.map((deck) => (
              <Link
                key={deck.slug}
                href={`/arena?deck=${deck.slug}`}
                className="arena-deck-card arena-deck-card--blind"
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
              >
                <span className="arena-deck-blind-tag">Blind rank</span>
                <h3>{deck.name}</h3>
                <p>{deck.tagline}</p>
                <span className="arena-deck-count">{deck.items.length} items · 8 picks</span>
              </Link>
            ))}
          </div>
          <p style={{ marginTop: 16 }}>
            <Link href="/arena" className="bh-btn bh-btn--primary">
              Start blind rank
            </Link>
          </p>
        </RuledSection>

        <RuledSection label="More games">
          <div className="arena-deck-grid">
            {GAMES.map((game) => (
              <Link
                key={game.href}
                href={game.href}
                className="arena-deck-card arena-deck-card--blind"
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
              >
                <span className="arena-deck-blind-tag">{game.tag}</span>
                <h3>{game.title}</h3>
                <p>{game.body}</p>
              </Link>
            ))}
          </div>
        </RuledSection>

        <RuledSection label="The engine">
          <p className="bh-muted" style={{ maxWidth: 640, lineHeight: 1.6 }}>
            Every ranking runs through the real Rank Engine — no decorative scores. Proof tools
            (health check, compare, museum) live in the{" "}
            <Link href="/lab">Lab</Link>. Certification when you need receipts:{" "}
            <Link href="https://slasso.com/certify?utm_source=dumbmodel&utm_medium=home">
              Validation Lab
            </Link>
            .
          </p>
          <Marginalia>
            Also playable in the{" "}
            <Link href="https://slasso.com/overworld?utm_source=dumbmodel&utm_medium=home">
              Overworld arcade
            </Link>
            .
          </Marginalia>
        </RuledSection>
      </Axis>
    </>
  );
}
