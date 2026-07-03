"use client";

import { useEffect, useMemo, useState } from "react";
import { getMetrics, getRun, listRuns } from "../../lib/api";
import { groupMetricsForCompare, lastValue } from "../../lib/chart-grouping";
import type { MetricRow, RunManifest } from "../../lib/types";
import { LineChart } from "../../components/LineChart";
import { StatTile } from "../../components/StatTile";
import { StatusPill } from "../../components/StatusPill";

interface RunData {
  run: RunManifest;
  rows: MetricRow[];
}

const SELECT_STYLE: React.CSSProperties = {
  background: "var(--surface-1)",
  color: "var(--ink)",
  border: "1px solid var(--ring)",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: "0.85rem",
  fontFamily: "inherit",
  minWidth: 0,
  flex: 1,
};

export default function ComparePage() {
  const [runs, setRuns] = useState<RunManifest[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [aId, setAId] = useState<string>("");
  const [bId, setBId] = useState<string>("");

  const [a, setA] = useState<RunData | null>(null);
  const [b, setB] = useState<RunData | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Fetch the run list once on mount. Default to the first two runs.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const out = await listRuns();
        if (!live) return;
        setRuns(out);
        setListError(null);
        if (out.length >= 2 && aId === "" && bId === "") {
          setAId(out[0].id);
          setBId(out[1].id);
        }
      } catch (e) {
        if (live) setListError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When both runs are selected, fetch their manifests + full metric series.
  useEffect(() => {
    if (!aId || !bId) {
      setA(null);
      setB(null);
      return;
    }
    let live = true;
    setLoadingData(true);
    setDataError(null);
    (async () => {
      try {
        const [runA, runB, rowsA, rowsB] = await Promise.all([
          getRun(aId),
          getRun(bId),
          getMetrics(aId, 0),
          getMetrics(bId, 0),
        ]);
        if (!live) return;
        setA({ run: runA, rows: rowsA });
        setB({ run: runB, rows: rowsB });
        setDataError(null);
      } catch (e) {
        if (live) setDataError(e instanceof Error ? e.message : String(e));
      } finally {
        if (live) setLoadingData(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [aId, bId]);

  const groups = useMemo(
    () => (a && b ? groupMetricsForCompare(a.rows, b.rows, a.run.name, b.run.name) : []),
    [a, b],
  );

  // Rank floor ref line for the effective-rank chart — prefer A, fall back to B.
  const rankFloor = useMemo(() => {
    if (a) {
      const f = lastValue(a.rows, "asn/rank_floor");
      if (f !== null) return f;
    }
    if (b) {
      const f = lastValue(b.rows, "asn/rank_floor");
      if (f !== null) return f;
    }
    return null;
  }, [a, b]);

  const swap = () => {
    setAId(bId);
    setBId(aId);
  };

  const showContent = runs !== null && (runs?.length ?? 0) >= 2;

  return (
    <>
      <div className="console-eyebrow">Observatory · Blue Hen RE</div>
      <h1 className="console-h1">Compare runs</h1>
      <p className="console-sub">
        Overlay two training runs on the same metric charts — loss, effective
        rank, R2D curvature — to see which trained better or collapsed less.
      </p>

      {listError && runs === null && (
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

      {runs && runs.length < 2 && (
        <div className="empty-state">
          Need at least two runs to compare. Instrument a training script with{" "}
          <code>runboard.init(...)</code> or seed demo runs with{" "}
          <code>uv run python -m runboard demo</code>.
        </div>
      )}

      {listError && runs !== null && (
        <div className="stale-banner" role="status">
          Telemetry source unreachable — run list may be stale.
        </div>
      )}

      {showContent && (
        <>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              margin: "0 0 16px",
              flexWrap: "wrap",
            }}
          >
            <label style={{ display: "flex", gap: 6, alignItems: "center", flex: "1 1 280px", minWidth: 0 }}>
              <span style={{ color: "var(--s1)", fontSize: "0.75rem", fontWeight: 600 }}>A</span>
              <select
                value={aId}
                onChange={(e) => setAId(e.target.value)}
                style={SELECT_STYLE}
                aria-label="Run A"
              >
                {runs!.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {r.project}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={swap}
              style={{
                background: "var(--surface-1)",
                color: "var(--ink-2)",
                border: "1px solid var(--ring)",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: "0.78rem",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
              aria-label="Swap run A and run B"
              title="Swap A and B"
            >
              ⇄ swap
            </button>
            <label style={{ display: "flex", gap: 6, alignItems: "center", flex: "1 1 280px", minWidth: 0 }}>
              <span style={{ color: "var(--s2)", fontSize: "0.75rem", fontWeight: 600 }}>B</span>
              <select
                value={bId}
                onChange={(e) => setBId(e.target.value)}
                style={SELECT_STYLE}
                aria-label="Run B"
              >
                {runs!.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {r.project}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {dataError && (
            <div className="stale-banner" role="status">
              Could not load run metrics — {dataError}
            </div>
          )}

          {loadingData && !a && !b && (
            <p style={{ color: "var(--muted)" }}>Loading runs…</p>
          )}

          {a && b && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <RunHeader data={a} letter="A" />
                <RunHeader data={b} letter="B" />
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
                      />
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}
        </>
      )}
    </>
  );
}

function RunHeader({ data, letter }: { data: RunData; letter: "A" | "B" }) {
  const { run, rows } = data;
  const color = letter === "A" ? "var(--s1)" : "var(--s2)";
  return (
    <div className="run-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <span className="run-card__name" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <span style={{ color, fontSize: "0.75rem", fontWeight: 700 }}>{letter}</span>
          {run.name}
        </span>
        <StatusPill status={run.status} />
      </div>
      <div className="run-card__meta">
        {run.project} · {new Date(run.createdAt).toLocaleString()}
        <br />
        {rows.length} logged steps{run.tags.length > 0 && <> · {run.tags.join(", ")}</>}
      </div>
      <div className="run-card__stats">
        {Object.entries(run.summary)
          .filter(([, v]) => typeof v === "number")
          .slice(0, 5)
          .map(([k, v]) => (
            <StatTile key={k} label={k} value={v as number} />
          ))}
      </div>
    </div>
  );
}
