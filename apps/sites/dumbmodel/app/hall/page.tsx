import Link from "next/link";
import { HallOfConeTable } from "@/components/HallOfCone";
import { CommunityHall } from "@/components/CommunityHall";
import { fetchHallSubmissions } from "@/lib/hall";
import { PageHeader } from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";

export const metadata = {
  title: "Hall of Cone — Baseline Comparison",
  description:
    "Reference baselines ranked by effective rank, plus consented community scores from the free health check.",
};

// Community submissions are read live from the Operations Ledger on every
// request — a cached page would show a stale (dishonest) board.
export const dynamic = "force-dynamic";

export default async function HallPage() {
  const surface = getSiteCircuit("dumbmodel");
  const feed = await fetchHallSubmissions();

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow ?? "Reference panel"}
        title="Hall of Cone"
        lead="Baseline embedders ranked by effective rank on a fixed evaluation panel — plus consented, anonymous scores submitted by visitors from the free health check."
      />
      <HallOfConeTable />
      <CommunityHall feed={feed} />
      <p style={{ marginTop: "var(--bh-space-6)" }}>
        <Link href="/check" className="bh-btn bh-btn--primary">
          Run the health check
        </Link>{" "}
        <Link href="/compare" className="bh-btn bh-btn--ghost">
          Run a comparison
        </Link>
      </p>
    </>
  );
}
