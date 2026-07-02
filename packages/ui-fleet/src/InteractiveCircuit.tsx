"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BRAND,
  getDivisionRelay,
  getLedgerStages,
  getOrgDivision,
  GLOSSARY,
  ledgerStageToDivision,
  LOOP_ORDER,
  stageLabel,
  type OrgDivisionId,
} from "@synthaembed/fleet";
import type { LedgerEntry } from "./RaceFeed";

const DIVISION_STYLE: Record<OrgDivisionId, { accent: string; tint: string }> = {
  orchestration: { accent: "#a78bfa", tint: "rgba(167, 139, 250, 0.12)" },
  data: { accent: "#38bdf8", tint: "rgba(56, 189, 248, 0.12)" },
  research: { accent: "#3d8bfd", tint: "rgba(61, 139, 253, 0.12)" },
  bd: { accent: "#e8c547", tint: "rgba(232, 197, 71, 0.12)" },
  execution: { accent: "#5cb87a", tint: "rgba(92, 184, 122, 0.12)" },
};

const STALL_MS = 24 * 60 * 60 * 1000;
const PULSE_MS = 5 * 60 * 1000;

function since(ts?: string): string {
  if (!ts) return "no advance yet";
  const ms = Date.now() - new Date(ts).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "advanced just now";
  if (m < 60) return `advanced ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `advanced ${h}h ago`;
  return `advanced ${Math.floor(h / 24)}d ago`;
}

/** The Operating Loop as a live board: division nodes are buttons —
 * click one for its latest ledger entry, owner, and time-since-advance.
 * Stalled loop flags after 24h without an advance; a fresh advance
 * pulses (motion-safe). Data: the site's BFF /api/ledger, polled. */
export function InteractiveCircuit({
  initialLedger = [],
  pollMs = 20000,
}: {
  initialLedger?: LedgerEntry[];
  pollMs?: number;
}) {
  const [ledger, setLedger] = useState<LedgerEntry[]>(initialLedger);
  const [selected, setSelected] = useState<OrgDivisionId | null>(null);

  useEffect(() => {
    let live = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/ledger", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { entries?: LedgerEntry[] };
        if (live && data.entries) setLedger(data.entries);
      } catch {
        // keep last-known state
      }
    };
    const id = setInterval(tick, pollMs);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [pollMs]);

  const { latestByDivision, latest } = useMemo(() => {
    const byDiv = new Map<OrgDivisionId, LedgerEntry>();
    for (const e of ledger) {
      const div = ledgerStageToDivision(e.stage) as OrgDivisionId | null;
      if (div && !byDiv.has(div)) byDiv.set(div, e); // entries arrive newest-first
    }
    return { latestByDivision: byDiv, latest: ledger[0] ?? null };
  }, [ledger]);

  const activeDivision = latest
    ? (ledgerStageToDivision(latest.stage) as OrgDivisionId | null)
    : null;
  const latestAge = latest?.ts ? Date.now() - new Date(latest.ts).getTime() : null;
  const stalled = latestAge !== null && latestAge > STALL_MS;
  const pulsing = latestAge !== null && latestAge >= 0 && latestAge < PULSE_MS;

  const detail = selected ? latestByDivision.get(selected) ?? null : null;
  const ledgerStages = getLedgerStages();

  return (
    <section className="fleet-closed-loop" aria-label={`${BRAND.operatingLoop} — live board`}>
      <div className="fleet-closed-loop__header">
        <div>
          <h2 style={{ fontSize: 16, margin: "0 0 6px" }}>{BRAND.operatingLoop}</h2>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.72, maxWidth: 640, lineHeight: 1.5 }}>
            Live board — select a division for its latest {GLOSSARY.raceLog} entry. (Spec 0012)
          </p>
        </div>
        {latest && (
          <p
            className={`fleet-badge ${stalled ? "warn" : "ok"}`}
            style={{ alignSelf: "flex-start", whiteSpace: "nowrap" }}
          >
            {stalled
              ? `Loop stalled · last advance ${since(latest.ts).replace("advanced ", "")}`
              : `Latest stage · ${stageLabel(latest.stage)}`}
          </p>
        )}
      </div>

      <div className="fleet-closed-loop__ring" role="group" aria-label="Divisions">
        {LOOP_ORDER.map((id, i) => {
          const div = getOrgDivision(id)!;
          const relay = getDivisionRelay(id);
          const style = DIVISION_STYLE[id];
          const active = activeDivision === id;
          const isSelected = selected === id;
          const divLatest = latestByDivision.get(id);

          return (
            <div key={id} className="fleet-closed-loop__node-wrap">
              <button
                type="button"
                className={`fleet-closed-loop__node bh-circuit__node${active ? " is-active" : ""}${
                  isSelected ? " is-selected" : ""
                }${active && pulsing ? " is-pulsing" : ""}`}
                style={{
                  borderColor: active || isSelected ? style.accent : "var(--fleet-border)",
                  background: active ? style.tint : "var(--fleet-surface)",
                  boxShadow: active ? `0 0 0 1px ${style.accent}` : undefined,
                }}
                aria-expanded={isSelected}
                onClick={() => setSelected(isSelected ? null : id)}
              >
                <span
                  className="fleet-closed-loop__node-badge"
                  style={{ color: style.accent, borderColor: style.accent }}
                >
                  {relay.short}
                </span>
                <span className="fleet-closed-loop__node-title">{relay.leg}</span>
                <span className="fleet-closed-loop__node-owner">{div.owner}</span>
                <span className="bh-circuit__since bh-mono">
                  {divLatest ? since(divLatest.ts) : "no advance yet"}
                </span>
              </button>
              {i < LOOP_ORDER.length - 1 && (
                <span className="fleet-closed-loop__arrow" aria-hidden>
                  →
                </span>
              )}
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="bh-circuit__detail" role="region" aria-label={`${getDivisionRelay(selected).leg} — latest entry`}>
          <div className="bh-circuit__detail-head">
            <strong style={{ color: DIVISION_STYLE[selected].accent }}>
              {getDivisionRelay(selected).leg}
            </strong>
            <span className="bh-muted" style={{ fontSize: "0.75rem" }}>
              owner: {getOrgDivision(selected)!.owner}
            </span>
          </div>
          {detail ? (
            <dl className="bh-circuit__detail-grid">
              <dt>Stage</dt>
              <dd className="bh-mono">{stageLabel(detail.stage)}</dd>
              <dt>Entry</dt>
              <dd>{detail.notes ?? detail.modelVersion ?? "—"}</dd>
              {typeof detail.metricDelta === "number" && (
                <>
                  <dt>Metric Δ</dt>
                  <dd className="bh-mono">
                    {detail.metricDelta >= 0 ? "+" : ""}
                    {detail.metricDelta.toFixed(4)}
                  </dd>
                </>
              )}
              <dt>When</dt>
              <dd className="bh-mono">{since(detail.ts)}</dd>
            </dl>
          ) : (
            <p className="bh-muted" style={{ margin: 0, fontSize: "0.8125rem" }}>
              No {GLOSSARY.raceLog} entries for this division yet.
            </p>
          )}
        </div>
      )}

      <div className="fleet-closed-loop__stages">
        <strong style={{ fontSize: 13, display: "block", marginBottom: 10 }}>
          {GLOSSARY.raceLog} stages
        </strong>
        <div className="fleet-closed-loop__stage-track">
          {ledgerStages.map((stage) => {
            const owner = ledgerStageToDivision(stage) as OrgDivisionId | null;
            const accent = owner ? DIVISION_STYLE[owner].accent : "var(--fleet-muted)";
            const lit = latest?.stage?.toLowerCase() === stage.toLowerCase();
            return (
              <span
                key={stage}
                className={`fleet-closed-loop__stage${lit ? " is-active" : ""}`}
                style={{
                  borderColor: lit ? accent : "var(--fleet-border)",
                  color: lit ? accent : "var(--fleet-muted)",
                }}
              >
                {stageLabel(stage)}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
