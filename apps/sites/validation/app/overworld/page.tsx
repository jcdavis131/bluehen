import "./overworld.css";
import { PageHeader } from "@synthaembed/ui-fleet";
import { OverworldClient } from "./OverworldClient";

export const metadata = {
  title: "The Overworld",
  description:
    "A small, honest tile world that simulates the real Blue Hen universe — walk the districts, read the worldbook, and see today's real happenings.",
};

/** The Overworld (Spec 0033 V0): a retro top-down world where every
 * district maps to a real business unit and every rendered fact traces
 * to a real API response. */
export default function OverworldPage() {
  return (
    <>
      <PageHeader
        eyebrow="Validation Lab · The Overworld"
        title="Walk the map."
        lead="Six districts, one tower, a world built from the same engine the fleet runs on. Nothing here is staged — the board reports real events, and the worldbook reads from the real wiki."
        badge={<span className="bh-badge bh-badge--accent">Original art · real data</span>}
      />
      <OverworldClient />
    </>
  );
}
