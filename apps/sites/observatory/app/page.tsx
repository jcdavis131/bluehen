"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Axis,
  Marginalia,
  RuledSection,
  StatusLine,
  TitleCard,
} from "@synthaembed/ui-fleet";
import { StatTile } from "../components/StatTile";
import { StatusPill } from "../components/StatusPill";
import { listRuns } from "../lib/api";
import type { RunManifest } from "../lib/types";

const POLL_MS = 5000;

export default function RunListPage() {
  const [runs, setRuns] = useState<RunManifest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const tick = async () => {
      try {
        const out = await listRuns();
        if (live) {
          setRuns(out);
          setError(null);
        }
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : String(e));
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  const running = runs?.filter((r) => r.status === "running").length ?? 0;

  return (
    <>
      <StatusLine
        site="training.jcamd.com"
        section="Observatory"
        status={runs === null ? "Connecting" : runs.length === 0 ? "No runs" : `${running} running`}
      />

      <Axis wide>
        <TitleCard
          eyebrow="Observatory · Blue Hen RE"
          title="Training Observatory"
          marginalia="Live run telemetry · autoresearch loop"
        >
          <p className="bh-title-card__copy">
            Live run telemetry across the autoresearch loop: loss, effective rank,
            collapse alerts, and R2D curvature.
          </p>
        </TitleCard>

        <RuledSection label="Run summary">
          {error && runs !== null && (
            <div className="stale-banner" role="status">
              Telemetry source unreachable. Run list may be stale.
            </div>
          )}

          {error && runs === null && (
            <div className="empty-state">
              <strong>Telemetry source unreachable.</strong>
              <br />
              Start the local reader and seed a demo run:
              <br />
              <code>uv run python -m runboard demo</code> then{" "}
              <code>uv run python -m runboard serve</code>
              <br />
              Production deployments point <code>NEXT_PUBLIC_TELEMETRY_URL</code> at
              core-api with a tenant key in <code>NEXT_PUBLIC_TELEMETRY_KEY</code>.
            </div>
          )}

          {runs && runs.length === 0 && (
            <div className="bh-alert">
              No runs recorded yet. Instrument a training script with{" "}
              <code>runboard.init(...)</code> or seed a demo run with{" "}
              <code>uv run python -m runboard demo</code>.
              <br />
              Production runs are recorded on the Railway volume — view via
              jcamd.com/ops or run <code>uv run python -m runboard list</code>{" "}
              locally.
            </div>
          )}

          {runs && runs.length > 0 && (
            <div className="run-card__stats" style={{ marginBottom: 20 }}>
              <StatTile label="Total runs" value={String(runs.length)} hero />
              <StatTile label="Running now" value={String(running)} hero />
            </div>
          )}
        </RuledSection>

        {runs && runs.length > 0 && (
          <RuledSection label="Runs">
            <div className="run-grid">
              {runs.map((run) => (
                <Link key={run.id} href={`/runs/${encodeURIComponent(run.id)}`} className="run-card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span className="run-card__name">{run.name}</span>
                    <StatusPill status={run.status} />
                  </div>
                  <div className="run-card__meta">
                    {run.project} · {new Date(run.createdAt).toLocaleString()}
                    {run.tags.length > 0 && <> · {run.tags.join(", ")}</>}
                  </div>
                  <div className="run-card__stats">
                    {summaryEntries(run).map(([k, v]) => (
                      <StatTile key={k} label={k} value={v} />
                    ))}
                  </div>
                </Link>
              ))}
            </div>
            <Marginalia>
              Each run records loss, effective rank, and collapse alerts: the same signals that gate deploys.
            </Marginalia>
          </RuledSection>
        )}
      </Axis>
    </>
  );
}

function summaryEntries(run: RunManifest): [string, number][] {
  const preferred = ["train/loss", "eval/ndcg10", "asn/effective_rank"];
  const out: [string, number][] = [];
  for (const key of preferred) {
    const v = run.summary[key];
    if (typeof v === "number") out.push([key.split("/")[1] ?? key, v]);
  }
  return out.slice(0, 3);
}
