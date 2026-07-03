import { PageHeader } from "@synthaembed/ui-fleet";import { getSiteCircuit } from "@synthaembed/fleet";import { HealthCheckPanel } from "../../components/HealthCheckPanel";

export const metadata = {
  title: "Embedding health check — dumbmodel.com",
  description:
    "Free measured diagnostics: paste your text, get the effective rank and space utilization of your content under a production embedding model.",
};

export default function CheckPage() {
  const surface = getSiteCircuit("dumbmodel");

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Embedding health check"
        lead="Paste a handful of representative texts. We embed them with the production model and measure — effective rank, space utilization, redundancy. No signup."
      />
      <HealthCheckPanel />
      <p className="bh-meta" style={{ marginTop: 16 }}>
        Method: variance-based Shannon-entropy effective rank over your sample&apos;s
        embedding matrix — the same telemetry the training loop monitors for
        collapse. Diagnostics are measured, never simulated.
      </p>
    </>
  );
}
