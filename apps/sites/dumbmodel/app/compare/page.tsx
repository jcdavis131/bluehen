import Link from "next/link";
import { ComparePanel } from "@/components/ComparePanel";
import { PageHeader, SiteSubnav } from "@synthaembed/ui-fleet";
import { getSiteCircuit, getSiteNav, RE } from "@synthaembed/fleet";

export const metadata = {
  title: "Compare — Baseline Comparison",
  description: `Side-by-side retrieval: baseline vs ${RE.tech} org model.`,
};

export default function ComparePage() {
  const surface = getSiteCircuit("dumbmodel");
  const nav = getSiteNav("dumbmodel");

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Model comparison"
        lead="Same query and corpus — evaluate retrieval quality across baseline and org-trained embedders."
      />
      <SiteSubnav items={nav} currentPath="/compare" />
      <ComparePanel />
      <p className="bh-muted" style={{ marginTop: "var(--bh-space-6)", fontSize: "0.8125rem" }}>
        Production org models via <code>core-api</code>. Certified benchmarks on{" "}
        <Link href="https://slasso.com">Validation Lab</Link>.
      </p>
    </>
  );
}
