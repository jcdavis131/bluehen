import type { MetricRow, Series } from "./types";

/* Fixed categorical slot order — colors follow the metric key, never its
 * position in a filtered list. */
export const SLOT_ORDER = ["--s1", "--s2", "--s3", "--s4", "--s5"] as const;

export interface ChartSpec {
  title: string;
  series: Series[];
}

export interface Group {
  name: string;
  charts: ChartSpec[];
}

/** One chart per metric key, grouped by prefix — except multi-series
 * families (e.g. asn/r2d_curvature_b1..bN) which share one chart. */
export function groupMetrics(rows: MetricRow[]): Group[] {
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

export function lastValue(rows: MetricRow[], key: string): number | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const v = rows[i].metrics[key];
    if (typeof v === "number") return v;
  }
  return null;
}

/** Merge two runs' grouped metrics into shared charts so they can be overlaid.
 *
 * Each chart keeps RunDetail's family grouping (multi-band families share one
 * chart). Series are recolored by run — A uses `--s1`, B uses `--s2` — and
 * labeled with the run letter plus the original band/key label so multi-band
 * families stay readable (e.g. "A · b1", "B · b1"). Series from A and B are
 * interleaved per band so the legend pairs them. */
export function groupMetricsForCompare(
  rowsA: MetricRow[],
  rowsB: MetricRow[],
  nameA: string,
  nameB: string,
): Group[] {
  const groupsA = groupMetrics(rowsA);
  const groupsB = groupMetrics(rowsB);
  const byNameB = new Map(groupsB.map((g) => [g.name, g]));

  const order = ["train", "eval", "asn", "other"];
  const mergedNames = new Set<string>([
    ...groupsA.map((g) => g.name),
    ...groupsB.map((g) => g.name),
  ]);

  const out: Group[] = [];
  for (const name of [...mergedNames].sort(
    (a, b) => order.indexOf(a) - order.indexOf(b),
  )) {
    const ga = groupsA.find((g) => g.name === name);
    const gb = byNameB.get(name);
    const chartsA = ga?.charts ?? [];
    const chartsB = gb?.charts ?? [];
    const byTitleB = new Map(chartsB.map((c) => [c.title, c]));
    const titles = new Set<string>([
      ...chartsA.map((c) => c.title),
      ...chartsB.map((c) => c.title),
    ]);
    const charts: ChartSpec[] = [];
    for (const title of [...titles].sort()) {
      const ca = chartsA.find((c) => c.title === title);
      const cb = byTitleB.get(title);
      const multi = (ca?.series.length ?? 0) > 1 || (cb?.series.length ?? 0) > 1;
      const merged: Series[] = [];
      const max = Math.max(ca?.series.length ?? 0, cb?.series.length ?? 0);
      for (let i = 0; i < max; i++) {
        const sa = ca?.series[i];
        const sb = cb?.series[i];
        if (sa) {
          merged.push({
            label: compareLabel("A", nameA, sa.label, multi),
            color: "--s1",
            points: sa.points,
          });
        }
        if (sb) {
          merged.push({
            label: compareLabel("B", nameB, sb.label, multi),
            color: "--s2",
            points: sb.points,
          });
        }
      }
      charts.push({ title, series: merged });
    }
    out.push({ name, charts });
  }
  return out;
}

function compareLabel(letter: string, runName: string, band: string, multi: boolean): string {
  if (multi) return `${letter} · ${band}`;
  return `${letter}: ${runName}`;
}
