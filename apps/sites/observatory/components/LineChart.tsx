"use client";

import { useMemo, useRef, useState } from "react";
import type { ChartEvent, Series } from "../lib/types";

const W = 560;
const H = 220;
const PAD = { top: 18, right: 74, bottom: 26, left: 46 };

interface Props {
  title: string;
  series: Series[];
  refLine?: { y: number; label: string };
  events?: ChartEvent[];
  yFormat?: (v: number) => string;
}

const fmt = (v: number): string =>
  Math.abs(v) >= 1000
    ? v.toFixed(0)
    : Math.abs(v) >= 10
      ? v.toFixed(1)
      : Math.abs(v) >= 0.01 || v === 0
        ? v.toFixed(3)
        : v.toExponential(1);

export function LineChart({ title, series, refLine, events = [], yFormat = fmt }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; px: number; py: number } | null>(null);

  const domain = useMemo(() => {
    const xs = series.flatMap((s) => s.points.map((p) => p.x));
    const ys = series.flatMap((s) => s.points.map((p) => p.y));
    if (refLine) ys.push(refLine.y);
    if (xs.length === 0) return null;
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    let y0 = Math.min(...ys);
    let y1 = Math.max(...ys);
    if (y0 === y1) {
      y0 -= 1;
      y1 += 1;
    }
    const padY = (y1 - y0) * 0.08;
    return { x0, x1: x1 === x0 ? x0 + 1 : x1, y0: y0 - padY, y1: y1 + padY };
  }, [series, refLine]);

  if (!domain || series.every((s) => s.points.length === 0)) {
    return (
      <div className="chart-panel">
        <h3 className="chart-panel__title">{title}</h3>
        <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>No data yet.</p>
      </div>
    );
  }

  const sx = (x: number) =>
    PAD.left + ((x - domain.x0) / (domain.x1 - domain.x0)) * (W - PAD.left - PAD.right);
  const sy = (y: number) =>
    H - PAD.bottom - ((y - domain.y0) / (domain.y1 - domain.y0)) * (H - PAD.top - PAD.bottom);

  const yTicks = [0, 1 / 3, 2 / 3, 1].map(
    (f) => domain.y0 + f * (domain.y1 - domain.y0),
  );
  const xTicks = [0, 0.5, 1].map((f) => domain.x0 + f * (domain.x1 - domain.x0));

  const nearest = hover
    ? series.map((s) => {
        let best = s.points[0];
        for (const p of s.points) {
          if (Math.abs(p.x - hover.x) < Math.abs(best.x - hover.x)) best = p;
        }
        return { label: s.label, color: s.color, point: best };
      })
    : null;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    if (px < PAD.left || px > W - PAD.right) {
      setHover(null);
      return;
    }
    const x = domain.x0 + ((px - PAD.left) / (W - PAD.left - PAD.right)) * (domain.x1 - domain.x0);
    setHover({ x, px, py: ((e.clientY - rect.top) / rect.height) * H });
  };

  const multi = series.length > 1;

  return (
    <div className="chart-panel" ref={wrapRef}>
      <h3 className="chart-panel__title">{title}</h3>
      {multi && (
        <div className="chart-legend">
          {series.map((s) => (
            <span key={s.label} className="chart-legend__item">
              <span className="chart-legend__swatch" style={{ background: `var(${s.color})` }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${title} line chart`}
        style={{ width: "100%", height: "auto", display: "block" }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={PAD.left} x2={W - PAD.right} y1={sy(t)} y2={sy(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={PAD.left - 6} y={sy(t) + 3} textAnchor="end" fontSize={9} fill="var(--muted)">
              {yFormat(t)}
            </text>
          </g>
        ))}
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="var(--axis)" strokeWidth={1} />
        {xTicks.map((t) => (
          <text key={`x${t}`} x={sx(t)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="var(--muted)">
            {Math.round(t)}
          </text>
        ))}

        {refLine && (
          <g>
            <line
              x1={PAD.left} x2={W - PAD.right} y1={sy(refLine.y)} y2={sy(refLine.y)}
              stroke="var(--status-critical)" strokeWidth={1} strokeDasharray="4 4" opacity={0.7}
            />
            <text x={W - PAD.right + 4} y={sy(refLine.y) + 3} fontSize={9} fill="var(--status-critical)">
              {refLine.label}
            </text>
          </g>
        )}

        {events.map((ev, i) => (
          <g key={`ev${i}`}>
            <line
              x1={sx(ev.x)} x2={sx(ev.x)} y1={PAD.top} y2={H - PAD.bottom}
              stroke={ev.kind === "collapse_alert" ? "var(--status-critical)" : "var(--status-warning)"}
              strokeWidth={1} strokeDasharray="2 3" opacity={0.8}
            />
            <text
              x={sx(ev.x)} y={PAD.top - 6} textAnchor="middle" fontSize={9}
              fill={ev.kind === "collapse_alert" ? "var(--status-critical)" : "var(--status-warning)"}
            >
              {ev.kind === "collapse_alert" ? "▲ collapse" : "● surgery"}
            </text>
          </g>
        ))}

        {series.map((s) => {
          const d = s.points
            .map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
            .join("");
          const last = s.points[s.points.length - 1];
          return (
            <g key={s.label}>
              <path d={d} fill="none" stroke={`var(${s.color})`} strokeWidth={2} strokeLinejoin="round" />
              {multi && last && (
                <text x={sx(last.x) + 5} y={sy(last.y) + 3} fontSize={9} fill={`var(${s.color})`}>
                  {s.label}
                </text>
              )}
            </g>
          );
        })}

        {nearest && hover && (
          <g>
            <line x1={hover.px} x2={hover.px} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--ink-2)" strokeWidth={1} opacity={0.4} />
            {nearest.map((n) => (
              <circle
                key={n.label} cx={sx(n.point.x)} cy={sy(n.point.y)} r={4}
                fill={`var(${n.color})`} stroke="var(--surface-1)" strokeWidth={2}
              />
            ))}
          </g>
        )}
      </svg>
      {nearest && hover && (
        <div
          className="chart-tooltip"
          style={{
            left: `${Math.min((hover.px / W) * 100, 70)}%`,
            top: `${(hover.py / H) * 100}%`,
          }}
        >
          <div>step <b>{Math.round(hover.x)}</b></div>
          {nearest.map((n) => (
            <div key={n.label}>
              {n.label}: <b>{yFormat(n.point.y)}</b>
              {Math.round(n.point.x) !== Math.round(hover.x) && (
                <span> (step {Math.round(n.point.x)})</span>
              )}
            </div>
          ))}
        </div>
      )}
      <DataTable series={series} yFormat={yFormat} />
    </div>
  );
}

/** Accessibility fallback: rows are keyed by step (union across series), so
 * unaligned series never get values attributed to the wrong step. */
function DataTable({ series, yFormat }: { series: Series[]; yFormat: (v: number) => string }) {
  const steps = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort(
    (a, b) => a - b,
  );
  const bySeries = series.map((s) => new Map(s.points.map((p) => [p.x, p.y])));
  return (
    <details className="metric-table-details">
      <summary>Data table</summary>
      <div style={{ maxHeight: 180, overflow: "auto" }}>
        <table className="metric-table">
          <thead>
            <tr>
              <th>step</th>
              {series.map((s) => (
                <th key={s.label}>{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {steps.map((x) => (
              <tr key={x}>
                <td>{Math.round(x)}</td>
                {series.map((s, i) => {
                  const v = bySeries[i].get(x);
                  return <td key={s.label}>{v === undefined ? "—" : yFormat(v)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
