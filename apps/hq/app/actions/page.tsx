import Link from "next/link";
import { PageHeader } from "@synthaembed/ui-fleet";import { GLOSSARY } from "@synthaembed/fleet";import { HillClimbActions } from "../../components/HillClimbActions";
import { BdPromotionPanel } from "../../components/BdPromotionPanel";

export const metadata = {
  title: `Lifecycle Controls — Headquarters`,
};

export default function ActionsPage() {

  return (
    <>
      <PageHeader
        eyebrow="Headquarters · jcamd.com"
        title="Lifecycle Controls"
        lead={
          <>
            Trigger full lifecycle runs while R&D continues background evaluation.{" "}
            <Link href="/">← fleet map</Link>
          </>
        }
        badge={<span className="bh-badge bh-badge--ok">Platform Orchestration</span>}
      />
      <h2 className="bh-section-title">{GLOSSARY.hillClimb} (intake → deployment)</h2>
      <HillClimbActions />
      <h2 className="bh-section-title" style={{ marginTop: "var(--bh-space-6)" }}>
        {GLOSSARY.bdQueue} (Phase A+)
      </h2>
      <BdPromotionPanel />
    </>
  );
}
