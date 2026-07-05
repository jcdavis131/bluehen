import { PageHeader } from "@synthaembed/ui-fleet";
import { LeylinesClient } from "./LeylinesClient";

export const metadata = {
  title: "Leylines — Applied Research · Blue Hen RE",
  description:
    "Two arXiv papers, chosen from opposite corners of the literature. Connect them through intermediate papers — each hop scored for real against the deployed model.",
};

export default function LeylinesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Leylines · a research game"
        title="Two papers. Find the hidden path."
        lead="Every hop you take teaches the graph something about how ideas actually connect."
      />
      <LeylinesClient />
    </>
  );
}
