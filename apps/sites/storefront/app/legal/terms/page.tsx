import { PageHeader } from "@synthaembed/ui-fleet";

export const metadata = { title: "Service Terms — Blue Hen RE" };

export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Service Terms"
        lead="Baseline terms for evaluation and managed-service engagements. Template pending counsel review — signed order forms govern."
      />
      <div className="bh-card">
        <p className="bh-card__body">
          <strong>1. Services.</strong> Blue Hen RE provides embedding and
          retrieval evaluation, model training, and managed serving as
          described in the applicable order form.
        </p>
        <p className="bh-card__body">
          <strong>2. Data.</strong> Customer data stays in the customer&apos;s
          isolated workspace (row-level security); it is not used to train
          models for other customers.
        </p>
        <p className="bh-card__body">
          <strong>3. Results.</strong> Benchmark figures shared in proposals
          reference reproducible runs; methodology is disclosed with every
          figure.
        </p>
        <p className="bh-card__body">
          <strong>4. Purchases.</strong> Self-serve orders are fulfilled
          through our commerce checkout; payment is processed by a
          PCI-compliant payment gateway, whose terms apply to the
          transaction. Card details never reach our servers.
        </p>
        <p className="bh-card__body">
          <strong>5. Contact.</strong> Questions to the team via the{" "}
          <a href="/contact">contact briefing</a>.
        </p>
      </div>
    </>
  );
}
