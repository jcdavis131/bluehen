import { PageHeader } from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";
import { RequestForm } from "../../components/RequestForm";

export const metadata = { title: "Custom harvests" };

export default function RequestsPage() {
  const surface = getSiteCircuit("refinery");
  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Custom harvests & dataset prep"
        lead="Scope a source, a cadence, and a format — the Data Operations team runs the same SSRF-guarded, provenance-carrying pipeline that powers this catalog, for your corpus. Simulation-grade honesty: proposals quote measured pipeline throughput, not promises."
      />
      <RequestForm />
    </>
  );
}
