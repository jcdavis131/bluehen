import { PageHeader } from "@synthaembed/ui-fleet";
import { GLOSSARY } from "@synthaembed/fleet";
import Link from "next/link";

export const metadata = {
  title: "Design Partners — Blue Hen RE",
  description:
    "We're taking three design partners: a custom recommender built free on your corpus, in exchange for case-study rights and biweekly feedback.",
};

const GIVES = [
  <>Case-study rights — you approve the final text before anything ships.</>,
  <>A biweekly 30-minute feedback call for 8 weeks.</>,
];

const GETS = [
  "A trained tenant model on your corpus and interaction data.",
  <>Integration support for <code>/v1/recommend</code> against your stack.</>,
  "A model report card: gates, thresholds, and metrics vs. your current setup.",
  "Measured before/after comparison against whatever you use today.",
];

const FIT = [
  "1,000+ documents or items in your corpus.",
  "Real user interactions to train and evaluate against — not a cold-start catalog.",
];

export default function DesignPartnersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Design partners"
        title="We're taking three design partners."
        lead={
          <>
            We build your custom recommender free — your corpus, our{" "}
            {GLOSSARY.closedLoop.toLowerCase()} — in exchange for case-study
            rights and a short biweekly check-in. Three seats, this round.
          </>
        }
      />

      <div className="bh-card bh-card--column">
        <div className="bh-card__title">The offer, plainly</div>
        <p className="bh-card__body">
          We build your custom recommender free — your corpus, our{" "}
          {GLOSSARY.closedLoop.toLowerCase()} — in exchange for:
        </p>
        <ul className="bh-card__body">
          {GIVES.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="bh-grid bh-grid--2" style={{ marginTop: 16 }}>
        <div className="bh-card bh-card--column">
          <div className="bh-card__title">What you get</div>
          <ul className="bh-card__body">
            {GETS.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="bh-card bh-card--column">
          <div className="bh-card__title">Who this fits</div>
          <p className="bh-card__body">
            Teams with a real corpus and real usage to learn from. Primary
            focus: real-estate teams matching buyers to inventory. Secondary:
            SaaS teams with docs or support content and live search traffic.
          </p>
          <ul className="bh-card__body">
            {FIT.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bh-card" style={{ marginTop: 16 }}>
        <div className="bh-card__title">The honesty clause</div>
        <p className="bh-card__body" style={{ fontStyle: "italic" }}>
          &ldquo;Results are published as measured — including if we lose to
          your current setup.&rdquo;
        </p>
        <p className="bh-card__body bh-meta">
          The report card and before/after comparison ship whether the
          numbers favor us or not.
        </p>
      </div>

      <div className="bh-card" style={{ marginTop: 16 }}>
        <div className="bh-card__title">Apply for a seat</div>
        <p className="bh-card__body">
          Three seats this round. Tell us about your corpus, your current
          solution, and your users — the team reviews applications within
          two business days.
        </p>
        <Link className="bh-btn" href="/contact?topic=design-partner">
          Apply as a design partner
        </Link>
        <p className="bh-card__body bh-meta" style={{ marginTop: 8 }}>
          On the contact form, select &ldquo;General&rdquo; as the topic and
          mention &ldquo;design partner&rdquo; in your message so it routes
          correctly.
        </p>
      </div>
    </>
  );
}
