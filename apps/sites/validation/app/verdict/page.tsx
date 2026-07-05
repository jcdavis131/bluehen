import "./verdict.css";
import { PageHeader } from "@synthaembed/ui-fleet";
import { VerdictClient } from "./VerdictClient";

export const metadata = {
  title: "The Verdict — Validation Lab",
  description:
    "Rapid-fire judging: a query and two retrieved passages. Pick the one that answers it — the engine's live ranking is revealed after your call.",
};

/** The Verdict (Spec 0031 §2/§7 GAME-004): margin-ranking preferences,
 * harvested one judged pair at a time. */
export default function VerdictPage() {
  return (
    <>
      <PageHeader
        eyebrow="Validation Lab · The Verdict"
        title="Order in the lab."
        lead="A query, two retrieved passages. Judge which one actually answers it — then see whether the engine's live ranking agrees."
        badge={<span className="bh-badge bh-badge--accent">Real retrieval, real ranks</span>}
      />
      <VerdictClient />
    </>
  );
}
