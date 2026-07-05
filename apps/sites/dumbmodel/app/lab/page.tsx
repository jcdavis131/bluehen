import Link from "next/link";
import { Axis, PageHeader, RuledSection, StatusLine } from "@synthaembed/ui-fleet";

export const metadata = {
  title: "Proof Lab",
  description: "Embedding diagnostics and baseline proof tools on dumbmodel.com.",
};

const TOOLS = [
  {
    href: "/check",
    title: "Health Check",
    body: "Paste text, get measured collapse diagnostics — effective rank, utilization, redundancy.",
  },
  {
    href: "/compare",
    title: "Compare models",
    body: "Same query, same corpus — side-by-side RAG retrieval against a baseline.",
  },
  {
    href: "/hall",
    title: "Hall of Cone",
    body: "Reference panel of baseline embedders ranked by effective rank.",
  },
  {
    href: "/museum",
    title: "Museum of Collapse",
    body: "Failure modes we measure against: anisotropy, dimension starvation, MRL cliffs.",
  },
];

export default function LabPage() {
  return (
    <>
      <StatusLine site="dumbmodel.com" section="Proof Lab" status="Diagnostics" />

      <Axis>
        <PageHeader
          eyebrow="Proof tools"
          title="Lab"
          lead="The arena is the game. These are the measured diagnostics behind dumbmodel.com — same eval gates, no marketing scores."
        />

        <RuledSection label="Tools">
          <div className="bh-grid bh-grid--2">
            {TOOLS.map((tool) => (
              <Link key={tool.href} href={tool.href} className="bh-card" style={{ textDecoration: "none" }}>
                <h2 className="bh-card__title bh-card__title--lg">{tool.title}</h2>
                <p className="bh-card__body">{tool.body}</p>
              </Link>
            ))}
          </div>
        </RuledSection>

        <p className="bh-muted">
          <Link href="/">← Back to Arena</Link>
        </p>
      </Axis>
    </>
  );
}
