import Link from "next/link";
import { ArxivExamDemo } from "../components/ArxivExamDemo";
import { PageHeader, SiteSubnav } from "@synthaembed/ui-fleet";
import { getSiteCircuit, getSiteNav, GLOSSARY, RE } from "@synthaembed/fleet";

export const metadata = {
  title: "Applied Research — arxiviq.com",
  description: "Live search + Research Registry · arxiviq.com",
};

export default function ResearchRagPage() {
  const surface = getSiteCircuit("research-rag");
  const nav = getSiteNav("research-rag");

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Applied Research"
        lead={
          <>
            Live retrieval on your org corpus · {RE.tech} in production ·{" "}
            <Link href="/research-lab">browse the {GLOSSARY.experimentMuseum.toLowerCase()} →</Link>
          </>
        }
        badge={<span className="bh-badge bh-badge--ok">R&D + Data Operations</span>}
      />
      <SiteSubnav items={nav} currentPath="/" />
      <ArxivExamDemo />
    </>
  );
}
