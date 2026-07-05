import { PageHeader } from "@synthaembed/ui-fleet";
import { GLOSSARY } from "@synthaembed/fleet";
import Link from "next/link";

export const metadata = {
  title: "Consulting Setup — Blue Hen RE",
  description:
    "We install the local AI stack on your infrastructure — our embedding model, the tuning loop, the open harness, and free-LLM wiring — and hand over one tuned domain model with a report card.",
};

const DELIVERABLES = [
  "A working local install on your machine: embedding server, open harness, skills library, and free-LLM (GLM-class) wiring — no per-token API bill.",
  "One tuned domain model, built on a corpus you provide, with a report card showing the gates it passed and an honest tuned-vs-zero-shot comparison on your own data.",
  "A live team walkthrough: how the install works, how to re-run tuning on a new corpus, how to read the report card.",
  "A 30-day support window for setup questions and issues.",
];

const TIMELINE = [
  {
    label: "Week 1",
    body: "Kickoff, infrastructure confirmed, corpus access set up. We install the stack on your machine and verify it end-to-end.",
  },
  {
    label: "Week 2",
    body: "We tune a model on your real corpus, produce the report card, and run the team walkthrough. Handover starts the 30-day support window.",
  },
];

const NEED_FROM_YOU = [
  "Access to the corpus you want the first model tuned on.",
  "A technical contact who can own the stack after handover.",
  "Any Linux box or laptop-class machine — no GPU, no cloud account required. Zero cloud cost is the point.",
];

const OUT_OF_SCOPE = [
  "Custom application development beyond the local API.",
  "Data cleaning beyond format conversion (the harness converts common formats; deduplication and curation are on you, or a separate add-on).",
  "Uptime SLAs — that's the managed tier, a separate conversation after this engagement.",
];

const FOLLOW_ON = [
  "Managed tuning — your model keeps compounding on your own usage inside our loop, running on our infrastructure.",
  "Quarterly re-certification — we re-tune and re-gate your model against current methods as they evolve.",
  "Design-partner conversion — if your corpus and usage fit, convert into a free custom build in exchange for case-study rights.",
];

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Services"
        title="We stand up the stack on your infrastructure."
        lead={
          <>
            A two-week engagement: our embedding model, the {GLOSSARY.closedLoop.toLowerCase()},
            the open eval harness, the skills library, and free-LLM wiring —
            installed on a machine you control, tuned on one of your corpora,
            and handed over with a report card. No cloud bill, no
            subscription required to start.
          </>
        }
      />

      <div className="bh-card bh-card--column">
        <div className="bh-card__title">What you get</div>
        <ul className="bh-card__body">
          {DELIVERABLES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="bh-grid bh-grid--2" style={{ marginTop: 16 }}>
        <div className="bh-card bh-card--column">
          <div className="bh-card__title">Timeline — 2 weeks standard</div>
          <ul className="bh-card__body">
            {TIMELINE.map((t) => (
              <li key={t.label}>
                <strong>{t.label}:</strong> {t.body}
              </li>
            ))}
          </ul>
          <p className="bh-card__body bh-meta">
            A rush timeline is available for teams that need it sooner — same
            deliverables, a tighter sequence.
          </p>
        </div>

        <div className="bh-card bh-card--column">
          <div className="bh-card__title">What we need from you</div>
          <ul className="bh-card__body">
            {NEED_FROM_YOU.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bh-card bh-card--column" style={{ marginTop: 16 }}>
        <div className="bh-card__title">Out of scope</div>
        <p className="bh-card__body">
          This is a setup engagement, not a managed service. Explicitly not
          included:
        </p>
        <ul className="bh-card__body">
          {OUT_OF_SCOPE.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="bh-card bh-card--column" style={{ marginTop: 16 }}>
        <div className="bh-card__title">After the engagement</div>
        <p className="bh-card__body">
          None of these are required, and none are sold as part of this
          engagement — they're what teams typically move to once the stack
          is running:
        </p>
        <ul className="bh-card__body">
          {FOLLOW_ON.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="bh-card" style={{ marginTop: 16 }}>
        <div className="bh-card__title">Pricing</div>
        <p className="bh-card__body">
          Pricing on briefing — tell us about your corpus and infrastructure
          and we'll quote a standard or rush engagement.
        </p>
        <Link className="bh-btn" href="/contact?topic=consulting">
          Contact us about a consulting setup engagement
        </Link>
      </div>
    </>
  );
}
