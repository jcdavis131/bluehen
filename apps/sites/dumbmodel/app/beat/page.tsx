import "./beat.css";
import "../arena/arena.css";
import { PageHeader, StatusLine } from "@synthaembed/ui-fleet";
import { BeatClient } from "./BeatClient";

export const metadata = {
  title: "Beat the Baseline",
  description:
    "Craft a query that should retrieve the anchor — but doesn't. Every rank is live, honest, and measured against the real baseline.",
};

export default function BeatPage() {
  return (
    <>
      <StatusLine site="dumbmodel.com" section="Beat It" status="Poison a query" />
      <PageHeader
        eyebrow="Beat the Baseline"
        title="Poison the query"
        lead="You get a real chunk from the research index. Write a query a human would agree means it — but the live baseline fails to find. Every score is a real eval, measured right now, never simulated."
      />
      <BeatClient />
    </>
  );
}
