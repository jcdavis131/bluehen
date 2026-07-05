import Link from "next/link";
import { HallOfConeTable } from "@/components/HallOfCone";
import { PageHeader } from "@synthaembed/ui-fleet";import { getSiteCircuit } from "@synthaembed/fleet";
export const metadata = {
  title: "Hall of Cone",
  description: "Reference baselines ranked by effective rank.",
};

export default function HallPage() {
  const surface = getSiteCircuit("dumbmodel");

  return (
    <>
      <PageHeader
        eyebrow="Reference panel"
        title="Hall of Cone"
        lead="Baseline embedders ranked by effective rank on a fixed evaluation panel."
      />
      <HallOfConeTable />
      <p style={{ marginTop: "var(--bh-space-6)" }}>
        <Link href="/compare" className="bh-btn bh-btn--primary">
          Run a comparison
        </Link>
      </p>
    </>
  );
}
