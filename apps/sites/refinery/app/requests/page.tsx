import { PageHeader } from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";
import { OrgByline } from "../../components/OrgByline";
import { RequestForm } from "../../components/RequestForm";

export const metadata = { title: "Custom harvests" };

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ dataset?: string | string[] }>;
}) {
  // UX-102 (Spec 0020): keep the dataset context from "Request full access"
  // links instead of silently dropping it into the generic form. Only
  // slug-shaped values pass through — anything else falls back to the
  // generic form, same as no param at all.
  const { dataset } = await searchParams;
  const raw = (Array.isArray(dataset) ? dataset[0] : dataset)?.trim() ?? "";
  const requestedDataset = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(raw)
    ? raw
    : undefined;
  const surface = getSiteCircuit("refinery");
  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Custom harvests & dataset prep"
        lead="Scope a source, a cadence, and a format — the Data Operations team runs the same SSRF-guarded, provenance-carrying pipeline that powers this catalog, for your corpus. Simulation-grade honesty: proposals quote measured pipeline throughput, not promises."
      >
        <OrgByline />
      </PageHeader>
      <RequestForm presetTopic={requestedDataset} />
    </>
  );
}
