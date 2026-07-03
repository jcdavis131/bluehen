import data from "../../data/research_lab.json";
import { PageHeader, SiteSubnav } from "@synthaembed/ui-fleet";
import { getSiteNav } from "@synthaembed/fleet";

export const metadata = {
  title: "Research Lab — Blue Hen RE",
  description:
    "Every embedding method the research org has tried, with measured verdicts and its stage in the Research → Business Development → Execution pipeline.",
};

type Method = {
  name: string;
  stage: string;
  status: string;
  summary: string;
  keyMetric: string;
  evidence: string;
};

// Visual treatment per pipeline stage (keyed to data.stages, in order).
// Accent + tint use the shared design-system stage tokens (tokens.css).
const STAGE_STYLE: Record<string, { accent: string; tint: string; blurb: string }> = {
  "In Research": {
    accent: "var(--bh-stage-rd)",
    tint: "var(--bh-stage-rd-tint)",
    blurb: "Under active investigation in the research org — measured, but not yet promoted.",
  },
  "Promoted to Business Development": {
    accent: "var(--bh-stage-validate)",
    tint: "var(--bh-stage-validate-tint)",
    blurb: "Earned its keep in research. Handed to Business Development for real-world tenant pilots.",
  },
  "In Execution": {
    accent: "var(--bh-stage-prod)",
    tint: "var(--bh-stage-prod-tint)",
    blurb: "Validated and shipped — part of the production serving / training path today.",
  },
  "Archived (rejected)": {
    accent: "var(--bh-stage-retired)",
    tint: "var(--bh-stage-retired-tint)",
    blurb: "Tested honestly and rejected. Kept here so we don't re-litigate dead ends.",
  },
};

// Status badge colour, derived from the measured verdict.
function statusColor(status: string): { color: string; border: string } {
  const s = status.toLowerCase();
  if (s.startsWith("rejected")) return { color: "var(--bh-stage-retired)", border: "var(--bh-danger-dim)" };
  if (s.startsWith("validating")) return { color: "var(--bh-stage-validate)", border: "var(--bh-clay-dim)" };
  if (s.startsWith("measured")) return { color: "var(--bh-stage-prod)", border: "var(--bh-moss-dim)" };
  return { color: "var(--bh-muted)", border: "var(--bh-border)" };
}

export default function ResearchLabPage() {
  const { title, subtitle, updated, evidenceProgram, stages, methods } = data;
  const byStage = (stage: string) => (methods as Method[]).filter((m) => m.stage === stage);
  const nav = getSiteNav("research");

  return (
    <>
      <PageHeader
        eyebrow="Research Registry · arxiviq.com"
        title={title}
        lead={subtitle}
      />
      <SiteSubnav items={nav} currentPath="/research-lab" />

      <p style={{ fontSize: 13, color: "var(--bh-muted)", marginBottom: 24 }}>
        Based on{" "}
        <strong style={{ color: "var(--bh-text)" }}>
          {evidenceProgram.totalRuns.toLocaleString()} runs
        </strong>{" "}
        and {evidenceProgram.trainings.toLocaleString()} trainings · evidence:{" "}
        {evidenceProgram.sources.join(", ")} · updated {updated}
      </p>

      {/* Pipeline legend */}
      <div
        className="fleet-card"
        style={{ marginBottom: 32, display: "flex", flexDirection: "column", gap: 10 }}
      >
        <strong style={{ fontSize: 14 }}>How the pipeline works</strong>
        <p style={{ fontSize: 13, color: "var(--fleet-muted)", lineHeight: 1.55, margin: 0 }}>
          The research org tests every embedding method on measured benchmarks. Methods that prove
          their worth are <strong style={{ color: "#e8c547" }}>promoted to Business Development</strong>{" "}
          for real-world tenant pilots, then the{" "}
          <strong style={{ color: "#5cb87a" }}>Execution team</strong> implements the winners in
          production. Dead ends are archived with the evidence that killed them.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {(stages as string[]).map((stage, i) => {
            const style = STAGE_STYLE[stage];
            return (
              <span key={stage} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: `1px solid ${style?.accent ?? "var(--fleet-border)"}`,
                    color: style?.accent ?? "var(--fleet-muted)",
                  }}
                >
                  {stage}
                  <span style={{ opacity: 0.6 }}>({byStage(stage).length})</span>
                </span>
                {i < stages.length - 1 && (
                  <span style={{ color: "var(--fleet-muted)", fontSize: 14 }}>→</span>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Methods grouped by stage */}
      {(stages as string[]).map((stage) => {
        const items = byStage(stage);
        if (items.length === 0) return null;
        const style = STAGE_STYLE[stage];
        return (
          <section key={stage} style={{ marginBottom: 36 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                borderLeft: `3px solid ${style?.accent ?? "var(--fleet-border)"}`,
                paddingLeft: 12,
                marginBottom: 6,
              }}
            >
              <h2 style={{ fontSize: 19, margin: 0, color: style?.accent ?? "var(--fleet-text)" }}>
                {stage}
              </h2>
              <span style={{ fontSize: 13, color: "var(--fleet-muted)" }}>
                {items.length} method{items.length === 1 ? "" : "s"}
              </span>
            </div>
            <p
              style={{
                fontSize: 12.5,
                color: "var(--fleet-muted)",
                margin: "0 0 14px 15px",
                maxWidth: 720,
              }}
            >
              {style?.blurb}
            </p>

            <div className="fleet-grid">
              {items.map((m) => {
                const sc = statusColor(m.status);
                return (
                  <article
                    key={m.name}
                    className="fleet-card"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      background: style?.tint
                        ? `linear-gradient(180deg, ${style.tint}, transparent 60%), var(--fleet-surface)`
                        : "var(--fleet-surface)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 10,
                      }}
                    >
                      <h3 style={{ fontSize: 15, margin: 0, lineHeight: 1.3 }}>{m.name}</h3>
                      <span
                        className="fleet-badge"
                        style={{ color: sc.color, borderColor: sc.border, whiteSpace: "nowrap" }}
                      >
                        {m.status}
                      </span>
                    </div>

                    <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0, opacity: 0.85 }}>
                      {m.summary}
                    </p>

                    <div
                      style={{
                        fontSize: 12.5,
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "var(--fleet-bg)",
                        border: "1px solid var(--fleet-border)",
                      }}
                    >
                      <span style={{ color: "var(--fleet-muted)" }}>Key metric · </span>
                      <span style={{ fontWeight: 600 }}>{m.keyMetric}</span>
                    </div>

                    <div style={{ fontSize: 11.5, color: "var(--fleet-muted)", marginTop: "auto" }}>
                      Evidence: {m.evidence}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
