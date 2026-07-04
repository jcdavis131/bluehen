import {
  CIRCUIT_HANDOFFS,
  CIRCUIT_LAPS,
  getClosedLoopSteps,
  getDivisionRelay,
  getLedgerStages,
  getOrgDivision,
  GLOSSARY,
  BRAND,
  RE,
  ledgerStageToDivision,
  listOrgDivisions,
  listSites,
  LOOP_ORDER,
  stageLabel,
  type OrgDivisionId,
} from "@synthaembed/fleet";
import { siteHref } from "./urls";

const DIVISION_STYLE: Record<
  OrgDivisionId,
  { accent: string; tint: string }
> = {
  orchestration: { accent: "var(--bh-div-orchestration)", tint: "var(--bh-div-orchestration-tint)" },
  data: { accent: "var(--bh-div-data)", tint: "var(--bh-div-data-tint)" },
  research: { accent: "var(--bh-div-research)", tint: "var(--bh-div-research-tint)" },
  bd: { accent: "var(--bh-div-bd)", tint: "var(--bh-div-bd-tint)" },
  execution: { accent: "var(--bh-div-execution)", tint: "var(--bh-div-execution-tint)" },
};

function sitesForDivision(id: OrgDivisionId) {
  return listSites({ status: "active" }).filter(
    (s) => s.orgDivision === id || s.secondaryDivisions?.includes(id),
  );
}

export function ClosedLoopDiagram({
  activeLedgerStage,
}: {
  /** Latest ledger stage — highlights the owning division. */
  activeLedgerStage?: string | null;
}) {
  const activeDivision = activeLedgerStage
    ? ledgerStageToDivision(String(activeLedgerStage))
    : null;
  const local = process.env.NEXT_PUBLIC_FLEET_LOCAL === "1";
  const steps = getClosedLoopSteps();
  const ledgerStages = getLedgerStages();
  const divisions = listOrgDivisions();

  return (
    <section className="fleet-closed-loop" aria-label="Operating Loop — closed-loop architecture">
      <div className="fleet-closed-loop__header">
        <div>
          <h2 style={{ fontSize: 16, margin: "0 0 6px" }}>{BRAND.operatingLoop}</h2>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.72, maxWidth: 640, lineHeight: 1.5 }}>
            Five functional divisions operate as one continuous improvement cycle. Data Operations
            prepares corpora, R&D trains and evaluates, Validation certifies against benchmarks,
            Production serves retrieval, and Orchestration routes gaps back to data.{" "}
            <span style={{ opacity: 0.65 }}>({RE.dual} · Spec 0012)</span>
          </p>
        </div>
        {activeLedgerStage && (
          <p className="fleet-badge ok" style={{ alignSelf: "flex-start", whiteSpace: "nowrap" }}>
            Latest stage · {stageLabel(activeLedgerStage)}
          </p>
        )}
      </div>

      <div className="fleet-closed-loop__ring">
        {LOOP_ORDER.map((id, i) => {
          const div = getOrgDivision(id)!;
          const relay = getDivisionRelay(id);
          const style = DIVISION_STYLE[id];
          const active = activeDivision === id;
          const sites = sitesForDivision(id);
          const next = LOOP_ORDER[(i + 1) % LOOP_ORDER.length];
          const nextRelay = getDivisionRelay(next);

          return (
            <div key={id} className="fleet-closed-loop__node-wrap">
              <div
                className={`fleet-closed-loop__node${active ? " is-active" : ""}`}
                style={{
                  borderColor: active ? style.accent : "var(--fleet-border)",
                  background: active ? style.tint : "var(--fleet-surface)",
                  boxShadow: active ? `0 0 0 1px ${style.accent}` : undefined,
                }}
              >
                <div
                  className="fleet-closed-loop__node-badge"
                  style={{ color: style.accent, borderColor: style.accent }}
                >
                  {relay.short}
                </div>
                <div className="fleet-closed-loop__node-title">{relay.leg}</div>
                <div className="fleet-closed-loop__node-owner">{div.owner}</div>
                <p className="fleet-closed-loop__node-mission">
                  Handoff: {relay.baton} · {relay.verb}
                </p>
                {sites.length > 0 && (
                  <div className="fleet-closed-loop__node-sites">
                    {sites.map((s) => (
                      <a
                        key={s.id}
                        href={siteHref(s, local)}
                        className="fleet-closed-loop__site-link"
                      >
                        {s.domain ?? s.id}
                      </a>
                    ))}
                  </div>
                )}
                <div className="fleet-closed-loop__handoff">
                  <span style={{ opacity: 0.55 }}>→</span> {nextRelay.leg}
                </div>
              </div>
              {i < LOOP_ORDER.length - 1 && (
                <span className="fleet-closed-loop__arrow" aria-hidden>
                  →
                </span>
              )}
            </div>
          );
        })}
        <div className="fleet-closed-loop__return">
          <span className="fleet-closed-loop__return-line" />
          <span className="fleet-closed-loop__return-label">
            production metrics &amp; data requests ↺ Orchestration
          </span>
        </div>
      </div>

      <div className="fleet-closed-loop__feedback">
        <strong style={{ fontSize: 13 }}>Cross-division feedback</strong>
        <ul>
          {CIRCUIT_HANDOFFS.map((h) => (
            <li key={h.text}>
              <span style={{ color: DIVISION_STYLE.bd.accent }}>{h.from}</span> → {h.to}: {h.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="fleet-closed-loop__stages">
        <strong style={{ fontSize: 13, display: "block", marginBottom: 10 }}>
          {GLOSSARY.raceLog} stages
        </strong>
        <div className="fleet-closed-loop__stage-track">
          {ledgerStages.map((stage) => {
            const owner = ledgerStageToDivision(stage);
            const accent = owner ? DIVISION_STYLE[owner].accent : "var(--fleet-muted)";
            const lit = activeLedgerStage?.toLowerCase() === stage.toLowerCase();
            return (
              <span
                key={stage}
                className={`fleet-closed-loop__stage${lit ? " is-active" : ""}`}
                style={{
                  borderColor: lit ? accent : "var(--fleet-border)",
                  color: lit ? accent : "var(--fleet-muted)",
                }}
                title={owner ? `${getDivisionRelay(owner).leg}` : undefined}
              >
                {stageLabel(stage)}
              </span>
            );
          })}
        </div>
      </div>

      <details className="fleet-closed-loop__steps">
        <summary>Lifecycle steps ({steps.length})</summary>
        <ol>
          {CIRCUIT_LAPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </details>

      <p className="fleet-closed-loop__meta">
        {divisions.length} divisions · config/org-divisions.json · docs/VOICE_AND_PLATFORM.md
      </p>
    </section>
  );
}
