import "./impact.css";
import { PageHeader } from "@synthaembed/ui-fleet";
import { ImpactClient } from "./ImpactClient";

export const metadata = {
  title: "Your dents in the model — dumbmodel.com",
  description:
    "Every triplet, pick, and verdict you've logged across the Arena and Beat the Baseline — plus the fleet-wide totals and a pseudonymous leaderboard.",
};

export default function ImpactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Player Impact"
        title="Your dents in the model."
        lead="Every game on dumbmodel writes real training data. This is the honest tally — what you've contributed, what everyone has, and who's ahead."
      />
      <ImpactClient />
    </>
  );
}
