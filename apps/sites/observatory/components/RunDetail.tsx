"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getEvents, getMetrics, getRun } from "../lib/api";
import type { ChartEvent, EventRow, MetricRow, RunManifest, Series } from "../lib/types";
import { LineChart } from "./LineChart";
import { StatTile } from "./StatTile";
import { StatusPill } from "./StatusPill";

const POLL_MS = 3000;

/* Fixed categorical slot order — colors follow the metric key, never its
 * position in a filtered list. */
const SLOT_ORDER = ["--s1", "--s2", "--s3", "--s4", "--s5"] as const;

export function RunDetail({ runId }: { runId: string }) {
  const [run, setRun] = useState<RunManifest | null>(null);
  const [rows, setRows] = useState<MetricRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const seen = useRef(0);
  const seenEvents = useRef(0);

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      try {
        const [manifest, newRows, newEvents] = await Promise.all([
          getRun(runId),
          getMetrics(runId, seen.current),
          getEvents(runId, seenEvents.current),
        ]);
        if (!live) return;
        setRun(manifest);
        if (newRows.length > 0) {
          seen.current += newRows.length;
          setRows((prev) => [...prev, ...newRows]);
        }
        if (newEvents.length > 0) {
          seenEvents.current += newEvents.length;
          setEvents((prev) => [...prev, ...newEvents]);
        }
        setError(null);
        if (manifest.status !== "running" && timer) {
          clearInterval(timer);
          timer = null;
        }
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : String(e));
      }
    };

    tick();
    timer = setInterval(tick, POLL_MS);
    return () => {
      live = false;
      if (timer) clearInterval(timer);
    };
  }, [runId]);

  const groups = useMemo(() => groupMetrics(rows), [rows]);
  const chartEvents: ChartEvent[] = useMemo(
    () => events.map((e) => ({ x: e.step, kind: e.kind, label: e.message })),
    [events],
  );

  const latestRank = lastValue(rows, "asn/effective_rank");
  const rankFloor = lastValue(rows, "asn/rank_floor");
  const collapsed =
    latestRank !== null && rankFloor !== null && latestRank < rankFloor;

  if (error && !run) {
    return (
      <div className="empty-state">
        <strong>Run unavailable.</strong> {error}
        <br />
        <Link href="/">← All runs</Link>
      </div>
    );
  }
  if (!run) return <p style={{ color: "var(--muted)" }}>Loading run…</p>;

  return (
    <>
      {error && (
        <div className="stale-banner" role="status">
          Telemetry source unreachable — showing last received data ({rows.length} steps).
        </div>
      )}
      <div className="console-eyebrow">
        <Link href="/">Training Observatory</Link> / {run.project}
      </div>
      <h1 className="console-h1" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {run.name} <StatusPill status={run.status} />
      </h1>
      <p className="console-sub">
        Started {new Date(run.createdAt).toLocaleString()} · {rows.length} logged steps
        {run.tags.length > 0 && <> · {run.tags.join(", ")}</>}
      </p>

      {collapsed && (
        <div className="alert-banner" role="alert">
          <span aria-hidden>▲</span>
          <span>
            <strong>Rank collapse:</strong> effective rank {latestRank?.toFixed(1)} is below the
            floor of {rankFloor?.toFixed(0)} — spectral surgery / heterosynaptic decay expected.
          </span>
        </div>
      )}

      <div className="run-card__stats" style={{ marginBottom: 8 }}>
        {Object.entries(run.summary)
          .filter(([, v]) => typeof v === "number")
          .slice(0, 5)
          .map(([k, v]) => (
            <StatTile key={k} label={k} value={v as number} hero />
          ))}
      </div>

      {groups.map((group) => (
        <section key={group.name}>
          <h2 className="console-section-title">{group.name}</h2>
          <div className="chart-grid">
            {group.charts.map((chart) => (
              <LineChart
                key={chart.title}
                title={chart.title}
                series={chart.series}
                refLine={
                  chart.title === "asn/effective_rank" && rankFloor !== null
                    ? { y: rankFloor, label: `floor ${rankFloor.toFixed(0)}` }
                    : undefined
                }
                events={chart.title.startsWith("asn/") ? chartEvents : []}
              />
            ))}
          </div>
        </section>
      ))}

      {events.length > 0 && (
        <section>
          <h2 className="console-section-title">Events</h2>
          <ul className="event-list">
            {[...events].reverse().map((e, i) => (
              <li key={i} className={`event-item event-item--${e.kind}`}>
                {e.message}
                <div className="event-item__meta">
                  step {e.step} · {e.kind} · {new Date(e.ts).toLocaleTimeString()}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="console-section-title">Configuration</h2>
        <div className="chart-panel" style={{ maxWidth: 560 }}>
          <table className="config-table">
            <tbody>
              {Object.entries(run.config).map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

interface ChartSpec {
  title: string;
  series: Series[];
}

interface Group {
  name: string;
  charts: ChartSpec[];
}

/** One chart per metric key, grouped by prefix — except multi-series
 * families (e.g. asn/r2d_curvature_b1..bN) which share one chart. */
function groupMetrics(rows: MetricRow[]): Group[] {
  const byKey = new Map<string, { x: number; y: number }[]>();
  for (const row of rows) {
    for (const [k, v] of Object.entries(row.metrics)) {
      if (typeof v !== "number") continue;
      let arr = byKey.get(k);
      if (!arr) {
        arr = [];
        byKey.set(k, arr);
      }
      arr.push({ x: row.step, y: v });
    }
  }

  const families = new Map<string, string[]>();
  for (const key of byKey.keys()) {
    const fam = key.replace(/_b\d+$/, "");
    const list = families.get(fam) ?? [];
    list.push(key);
    families.set(fam, list);
  }

  const groups = new Map<string, ChartSpec[]>();
  const famNames = [...families.keys()].sort();
  for (const fam of famNames) {
    const keys = families.get(fam)!;
    keys.sort();
    const skip = fam === "asn/rank_floor" && families.has("asn/effective_rank");
    if (skip) continue; // rendered as the reference line on the rank chart
    const series: Series[] = keys.map((k, i) => ({
      label: keys.length > 1 ? k.slice(fam.length + 1) || k : k,
      color: SLOT_ORDER[i % SLOT_ORDER.length],
      points: byKey.get(k)!,
    }));
    const prefix = fam.includes("/") ? fam.split("/")[0] : "other";
    const list = groups.get(prefix) ?? [];
    list.push({ title: fam, series });
    groups.set(prefix, list);
  }

  const order = ["train", "eval", "asn"];
  return [...groups.entries()]
    .sort(([a], [b]) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })
    .map(([name, charts]) => ({ name, charts }));
}

function lastValue(rows: MetricRow[], key: string): number | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const v = rows[i].metrics[key];
    if (typeof v === "number") return v;
  }
  return null;
}
