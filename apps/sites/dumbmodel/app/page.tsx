import Link from "next/link";
import {
  Axis,
  AssetStrip,
  Marginalia,
  RuledSection,
  StatusLine,
  TitleCard,
} from "@synthaembed/ui-fleet";
import { listDecks } from "./arena/decks";

export const metadata = {
  title: "Arcade",
  description:
    "Blind Rank, Beat the Baseline, and your impact on the model — the dumbmodel arcade.",
};

const MODES = [
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
  {
    href: "/check",
    tag: "Diagnostics",
    title: "Health Check",
    body: "Paste your own text, get effective rank and collapse diagnostics on the production model. No signup.",
  },
];

const ROSTER = [
  {
    href: "/lab",
    tag: "Lab",
    title: "The Lab",
    body: "Compare models head-to-head, browse the museum of collapsed representations, and run proof tools.",
  },
  {
    href: "https://slasso.com/certify?utm_source=dumbmodel&utm_medium=home",
    tag: "Certification",
    title: "Validation Lab",
    body: "When you need receipts: paid RAG certification with published scorecards and the promotion queue.",
  },
];

export default function HomePage() {
  const decks = listDecks();

  return (
    <>
      <StatusLine site="dumbmodel.com" section="Arcade" status="Season open" />

      <Axis wide>
        <TitleCard
          eyebrow="The Rank Arcade · a Blue Hen RE studio"
          title="Rank blind. Try to break the model."
          marginalia="Season always open · the Rank Engine scores every pick live"
        >
          <p className="bh-title-card__copy">
            dumbmodel is the studio's arcade. Rank blind, poison a query, run a free
            health check, and watch your dents land in a real model. We roast collapsed
            representations — never you — and every punchline traces to a number measured
            live, never staged.
          </p>
        </TitleCard>

        <RuledSection label="Season status">
          <div className="bh-grid" style={{ marginBottom: "var(--bh-space-8)" }}>
            <div className="bh-card">
              <div className="bh-label">Decks in rotation</div>
              <div className="bh-stat">{decks.length} fixtures</div>
            </div>
            <div className="bh-card">
              <div className="bh-label">Picks per run</div>
              <div className="bh-stat">8 blind picks</div>
            </div>
            <div className="bh-card">
              <div className="bh-label">Game modes</div>
              <div className="bh-stat">{MODES.length + 1} playable</div>
            </div>
            <div className="bh-card">
              <div className="bh-label">Proof tools</div>
              <div className="bh-stat bh-stat--ok">No signup</div>
            </div>
          </div>
          <Marginalia>
            Every game feeds the engine that trains the models —{" "}
            <Link href="https://bhenre.com">bhenre.com</Link> runs the business side.
          </Marginalia>
        </RuledSection>

        <RuledSection label="Blind Rank — current fixtures">
          <div className="bh-grid">
            {decks.map((deck) => (
              <Link
                key={deck.slug}
                href={`/arena?deck=${deck.slug}`}
                className="bh-card bh-card--column"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="bh-card__row">
                  <h3 className="bh-card__title bh-card__title--lg">{deck.name}</h3>
                  <span className="bh-badge bh-badge--accent">Blind rank</span>
                </div>
                <p className="bh-card__body">{deck.tagline}</p>
                <div className="bh-meta">{deck.items.length} items · 8 picks</div>
                <span className="bh-card__subtitle">Start run →</span>
              </Link>
            ))}
          </div>
          <p style={{ marginTop: "var(--bh-space-5)" }}>
            <Link href="/arena" className="bh-btn bh-btn--primary">
              Pick a deck &amp; start blind rank
            </Link>
          </p>
        </RuledSection>

        <RuledSection label="Game modes">
          <div className="bh-grid">
            {MODES.map((mode) => (
              <Link
                key={mode.href}
                href={mode.href}
                className="bh-card bh-card--column"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="bh-card__row">
                  <h3 className="bh-card__title bh-card__title--lg">{mode.title}</h3>
                  <span className="bh-badge bh-badge--ok">{mode.tag}</span>
                </div>
                <p className="bh-card__body">{mode.body}</p>
                <span className="bh-card__subtitle">Play →</span>
              </Link>
            ))}
          </div>
        </RuledSection>

        <RuledSection label={"The roster — proof & certification"}>
          <div className="bh-grid">
            {ROSTER.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bh-card bh-card--column"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="bh-card__row">
                  <h3 className="bh-card__title bh-card__title--lg">{item.title}</h3>
                  <span className="bh-badge">{item.tag}</span>
                </div>
                <p className="bh-card__body">{item.body}</p>
                <span className="bh-card__subtitle">Open →</span>
              </Link>
            ))}
          </div>
          <Marginalia>
            Also playable in the{" "}
            <Link href="https://slasso.com/overworld?utm_source=dumbmodel&utm_medium=home">
              Overworld arcade
            </Link>
            .
          </Marginalia>
        </RuledSection>

        <RuledSection label="The engine">
          <p className="bh-muted" style={{ maxWidth: 640, lineHeight: 1.6 }}>
            Every ranking runs through the real Rank Engine — no decorative scores. Proof
            tools (health check, compare, museum) live in the{" "}
            <Link href="/lab">Lab</Link>. Certification when you need receipts:{" "}
            <Link href="https://slasso.com/certify?utm_source=dumbmodel&utm_medium=home">
              Validation Lab
            </Link>
            .
          </p>
          <AssetStrip />
        </RuledSection>
      </Axis>
    </>
  );
}
