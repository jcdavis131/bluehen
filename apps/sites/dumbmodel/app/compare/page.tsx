import Link from "next/link";
import { ComparePanel } from "@/components/ComparePanel";
import { PageHeader } from "@synthaembed/ui-fleet";
import { getSiteCircuit, RE } from "@synthaembed/fleet";
export const metadata = {
  title: "Compare",
  description: `Side-by-side retrieval: baseline vs ${RE.tech} org model.`,
};

export default function ComparePage() {
  const surface = getSiteCircuit("dumbmodel");

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Model comparison"
        lead="Same query and corpus — baseline panel vs our tuned head. Domain-tuned models beat zero-shot BGE on 4/4 tenant corpora (EVIDENCE §3.7); deployed model beats the commercial panel on hard real-text (§3.12, §3.15)."
      />
      <ComparePanel />
      <p className="bh-muted" style={{ marginTop: "var(--bh-space-6)", fontSize: "0.8125rem" }}>
        Production org models via <code>core-api</code>. Certified benchmarks on{" "}
        <Link href="https://slasso.com">Validation Lab</Link>.
      </p>
    </>
  );
}
