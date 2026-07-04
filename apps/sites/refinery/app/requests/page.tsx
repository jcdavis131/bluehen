import { PageHeader } from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";
import { RequestForm } from "../../components/RequestForm";

export const metadata = { title: "Custom harvests" };

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ dataset?: string }>;
}) {
  const { dataset } = await searchParams;
  const surface = getSiteCircuit("refinery");
  const presetTopic = dataset ? `full-access:${dataset}` : "custom-harvest";

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Custom harvests & dataset prep"
        lead={
          dataset
            ? `Scoped request for catalog dataset “${dataset}”. For self-serve purchase of the published corpus, use Buy full corpus on the dataset page.`
            : "Scope a source, a cadence, and a format. The Data Operations team runs the same SSRF-guarded, provenance-carrying pipeline that powers this catalog, for your corpus. Simulation-grade honesty: proposals quote measured pipeline throughput, not promises."
        }
      />
      <RequestForm presetTopic={presetTopic} />
    </>
  );
}
