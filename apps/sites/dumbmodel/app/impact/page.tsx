import "./impact.css";
import { PageHeader, StatusLine } from "@synthaembed/ui-fleet";
import { ImpactClient } from "./ImpactClient";

export const metadata = {
  title: "Your Impact",
  description:
    "Every triplet, pick, and verdict you've logged across Blind Rank and Beat the Baseline — plus fleet-wide totals.",
};

export default function ImpactPage() {
  return (
    <>
      <StatusLine site="dumbmodel.com" section="Impact" status="Your dents" />
      <PageHeader
        eyebrow="Player Impact"
        title="Your dents in the model."
        lead="Every game on dumbmodel writes real training data. This is the honest tally — what you've contributed, what everyone has, and who's ahead."
      />
      <ImpactClient />
    </>
  );
}
