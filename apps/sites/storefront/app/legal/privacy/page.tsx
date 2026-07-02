import { PageHeader } from "@synthaembed/ui-fleet";

export const metadata = { title: "Privacy — Blue Hen RE" };

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Privacy"
        lead="What we collect and why. Template pending counsel review."
      />
      <div className="bh-card">
        <p className="bh-card__body">
          <strong>Contact briefings.</strong> Name, email, company, and message
          are stored to respond to your inquiry and are not sold or shared for
          advertising.
        </p>
        <p className="bh-card__body">
          <strong>Store purchases.</strong> Checkout is completed on our
          commerce provider&apos;s hosted flow; payment details are handled by
          a PCI-compliant payment gateway and never reach our servers.
        </p>
        <p className="bh-card__body">
          <strong>Product telemetry.</strong> The platform records API usage
          per workspace for budgeting and abuse prevention. Tenant corpora are
          isolated with row-level security.
        </p>
        <p className="bh-card__body">
          <strong>Removal.</strong> Email the team via the{" "}
          <a href="/contact">contact page</a> to request deletion of briefing
          records.
        </p>
      </div>
    </>
  );
}
