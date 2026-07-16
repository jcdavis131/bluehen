import Link from "next/link";
import data from "../../data/methods.json";
import { PageHeader } from "@synthaembed/ui-fleet";
import { getSiteCircuit, GLOSSARY, RE } from "@synthaembed/fleet";
import { ProductionCaseStudy } from "../../components/ProductionCaseStudy";
import { EvidenceLink } from "../../lib/evidenceLinks";

export const metadata = {
  title: "Method — Applied Research · arxiviq.com",
  description:
    "The org recipe behind the arxiviq embedding model, with the dated evidence that supports each choice.",
};

type Verdict = { name: string; metric: string; evidence: string };
type Gate = { gate: string; rule: string; status: string };
type TimelineEntry = { date: string; section: string; headline: string; detail: string };

const VERDICT_GROUPS: { key: "shipped" | "promoted" | "rejected"; label: string; accent: string }[] = [
  { key: "shipped", label: "In production", accent: "#5cb87a" },
  { key: "promoted", label: "Promoted to Business Development", accent: "#e8c547" },
  { key: "rejected", label: "Tested and rejected", accent: "#d96565" },
];

export default function MethodsPage() {
  const surface = getSiteCircuit("research");
  const { recipe, evidenceProgram, timeline, verdicts, deployGates } = data;

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Method, recipe, and evidence"
        lead={
          <>
            The org recipe behind arxiviq.com, with the dated evidence that supports each choice. Every
            claim traces to a row in{" "}
            <a href="https://github.com/jcdavis131/bluehenre/blob/main/EVIDENCE.md" target="_blank" rel="noopener noreferrer">
              EVIDENCE.md
            </a>
            . {RE.tech} is not shipped on a hypothesis.
            See the <Link href="/research-lab">Research Registry</Link> for the full method table.
          </>
        }
        badge={<span className="fleet-badge ok">R&amp;D · Evidence-backed</span>}
      />

      <section className="bh-card bh-card--organic" style={{ marginBottom: 24 }}>
        <div className="bh-card__title">Plain-language takeaway</div>
        <p className="bh-card__body">
          arxiviq.com runs a domain-tuned embedding model on a harvested arXiv corpus. We only ship changes
          that pass measured deploy gates (nDCG, effective rank, edge-tier drop). Methods that looked good
          in synthetic sweeps but failed real-pair eval or edge stress were rejected — the timeline below is
          the audit trail, not marketing copy.
        </p>
      </section>

      <ProductionCaseStudy />

      {/* Org recipe */}
      <section className="fleet-card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <strong style={{ fontSize: 15 }}>Org recipe (charter)</strong>
          <span style={{ fontSize: 12, color: "var(--fleet-muted)" }}>
            config/recipes/research.json · updated {data.updated}
          </span>
        </div>
        <div className="fleet-grid">
          <RecipeCell label="Base model" value={recipe.baseModel} mono />
          <RecipeCell label="Epochs / batch" value={`${recipe.epochs} / ${recipe.batchSize}`} />
          <RecipeCell label="Loss" value={`InfoNCE temp=${recipe.loss.infoNceTemp}, zELO w=${recipe.loss.zeloWeight}`} />
          <RecipeCell label="PEFT" value={recipe.peft ? "on" : "off"} />
          <RecipeCell
            label="ASN"
            value={`kStrong=${recipe.asn.kStrong}, kTail=${recipe.asn.kTail}, λ=${recipe.asn.lambda}`}
          />
          <RecipeCell label="Newton-Schulz" value={`${recipe.asn.newtonSchulzSteps} steps`} />
          <RecipeCell
            label="Matryoshka dims"
            value={recipe.asn.matryoshkaDims.join(" · ")}
            mono
          />
          <RecipeCell label="Rollback" value={recipe.rollbackCriteria} />
        </div>
      </section>

      {/* Evidence program summary */}
      <section className="fleet-card" style={{ marginBottom: 24, fontSize: 13 }}>
        <strong style={{ fontSize: 15 }}>Evidence program</strong>
        <p style={{ opacity: 0.78, lineHeight: 1.55, margin: "8px 0 12px", maxWidth: 760 }}>
          Based on{" "}
          <strong style={{ color: "var(--fleet-text)" }}>{evidenceProgram.totalRuns.toLocaleString()} runs</strong>{" "}
          and {evidenceProgram.trainings.toLocaleString()} trainings. Sources:{" "}
          {evidenceProgram.sources.join(", ")}.
        </p>
      </section>

      {/* Dated timeline */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 19, margin: "0 0 14px" }}>Evidence timeline</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(timeline as TimelineEntry[]).map((t) => (
            <div
              key={`${t.date}-${t.section}`}
              className="fleet-card"
              style={{ display: "flex", gap: 16, alignItems: "flex-start" }}
            >
              <div
                style={{
                  flex: "0 0 110px",
                  fontSize: 12,
                  color: "var(--fleet-muted)",
                  fontFamily: "ui-monospace",
                  paddingTop: 2,
                }}
              >
                <div style={{ color: "var(--fleet-text)", fontWeight: 600 }}>{t.date}</div>
                <div>{t.section}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{t.headline}</div>
                <p style={{ fontSize: 12.5, opacity: 0.8, lineHeight: 1.5, margin: 0 }}>{t.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Verdicts */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 19, margin: "0 0 14px" }}>What we ship, promote, and reject</h2>
        <div className="fleet-grid">
          {VERDICT_GROUPS.map((group) => {
            const items = (verdicts as Record<string, Verdict[]>)[group.key];
            return (
              <article
                key={group.key}
                className="fleet-card"
                style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: `3px solid ${group.accent}` }}
              >
                <h3 style={{ fontSize: 14, margin: 0, color: group.accent }}>{group.label}</h3>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, lineHeight: 1.6 }}>
                  {items.map((v) => (
                    <li key={v.name} style={{ marginBottom: 8 }}>
                      <div style={{ fontWeight: 600 }}>{v.name}</div>
                      <div style={{ opacity: 0.7 }}>
                        {v.metric} · <EvidenceLink evidenceRef={v.evidence} />
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      {/* Deploy gates */}
      <section className="fleet-card" style={{ marginBottom: 24 }}>
        <strong style={{ fontSize: 15 }}>Deploy gates (eval-harness)</strong>
        <p style={{ fontSize: 12.5, opacity: 0.7, lineHeight: 1.5, margin: "6px 0 14px", maxWidth: 720 }}>
          A model reaches arxiviq.com only when every gate passes for real. Gates fail closed when a
          dimension is unmeasured, never stubbed true.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(deployGates as Gate[]).map((g) => (
            <div
              key={g.gate}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "center",
                fontSize: 12.5,
                padding: "8px 10px",
                borderRadius: 8,
                background: "var(--fleet-bg)",
                border: "1px solid var(--fleet-border)",
              }}
            >
              <code style={{ fontWeight: 600 }}>{g.gate}</code>
              <span style={{ opacity: 0.8, flex: 1 }}>{g.rule}</span>
              <span className="fleet-badge ok" style={{ whiteSpace: "nowrap" }}>
                {g.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="fleet-card" style={{ fontSize: 13, opacity: 0.8 }}>
        <strong>Corpus:</strong> 702 arXiv abstracts harvested across CS.CL / retrieval / embedding queries
        into <code>data/corpora/research/corpus.jsonl</code>. Re-kickoff with{" "}
        <code>pnpm harvest:arxiv &amp;&amp; pnpm kickoff:orgs</code> after the stack is up.
      </div>
    </>
  );
}

function RecipeCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "10px 12px",
        borderRadius: 8,
        background: "var(--fleet-bg)",
        border: "1px solid var(--fleet-border)",
        fontSize: 12.5,
      }}
    >
      <span style={{ color: "var(--fleet-muted)", fontSize: 11 }}>{label}</span>
      <span style={{ fontWeight: 600, fontFamily: mono ? "ui-monospace" : "inherit", wordBreak: "break-word" }}>
        {value}
      </span>
    </div>
  );
}
