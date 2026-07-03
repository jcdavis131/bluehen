import { apiFetch, hasCoreApi } from "@synthaembed/ui-fleet/site-api";

/**
 * Hall of Cone community submissions (Spec 0020, UX-121).
 *
 * Consented scores from /check persist as Operations Ledger entries
 * (core-api POST /v1/ledger, stage `hall-submission`) — the only durable,
 * tenant-writable store the site's server key can both write AND read back
 * today. The structured payload rides in `notes` as compact JSON because
 * GET /v1/ledger returns { stage, siteId, notes, modelVersion, metricDelta,
 * costUsd, ts } and drops `hyperparameters`.
 *
 * Honesty rules: every number is copied from a measured /v1/diagnose
 * response, validated against the same invariants the share permalink
 * enforces (lib/share.ts) on write AND on read — a malformed or tampered
 * entry is silently excluded, never rendered as a score. Anonymous by
 * construction: a visitor-chosen display name plus the measured numbers,
 * nothing else.
 */

export const HALL_STAGE = "hall-submission";
export const SITE_ID = "dumbmodel";
/** GET /v1/ledger supports only `limit` (no stage filter), so the community
 * board reads the workspace's most recent N entries and filters client-side.
 * Submissions older than the busiest N ledger entries scroll out of view —
 * an honest window, stated in the UI. */
export const LEDGER_WINDOW = 200;

export type HallSubmission = {
  /** Visitor-chosen display label — the only free-text field stored. */
  name: string;
  effectiveRank: number;
  maxPossibleRank: number;
  utilization: number;
  samples: number;
  dims: number;
  /** Serving model that measured the sample. */
  modelVersion: string;
  ts?: string;
};

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Trim, collapse whitespace, strip control characters; 1–48 code points.
 * Returns null when nothing printable remains. */
export function sanitizeName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  return [...cleaned].slice(0, 48).join("");
}

/** Same envelope the share permalink enforces — the range of values
 * /v1/diagnose can actually produce. Anything outside is rejected. */
export function validMeasurement(s: {
  effectiveRank?: unknown;
  maxPossibleRank?: unknown;
  utilization?: unknown;
  samples?: unknown;
  dims?: unknown;
  modelVersion?: unknown;
}): boolean {
  const { effectiveRank: er, maxPossibleRank: mr, utilization: u, samples: n, dims: d, modelVersion: m } = s;
  if (!finite(er) || !finite(mr) || !finite(u)) return false;
  if (!finite(n) || !Number.isInteger(n) || n < 3 || n > 64) return false;
  if (!finite(d) || !Number.isInteger(d) || d < 1 || d > 65536) return false;
  if (typeof m !== "string" || m.length === 0 || m.length > 48) return false;
  if (u <= 0 || u > 1) return false;
  if (er <= 0 || mr <= 0 || er > mr + 0.05) return false;
  return true;
}

/** Compact wire shape stored in the ledger `notes` column. */
type HallNoteWire = {
  v: 1;
  kind: "hall";
  name: string;
  er: number;
  mr: number;
  u: number;
  s: number;
  d: number;
};

export function encodeHallNote(sub: Omit<HallSubmission, "ts">): string {
  const wire: HallNoteWire = {
    v: 1,
    kind: "hall",
    name: sub.name,
    er: Number(sub.effectiveRank.toFixed(1)),
    mr: Number(sub.maxPossibleRank.toFixed(1)),
    u: Number(sub.utilization.toFixed(4)),
    s: sub.samples,
    d: sub.dims,
  };
  return JSON.stringify(wire);
}

type LedgerRow = {
  stage?: string;
  siteId?: string | null;
  notes?: string | null;
  modelVersion?: string | null;
  ts?: string;
};

/** Parse one ledger row back into a submission; null on anything that is
 * not a well-formed, in-range hall entry. */
export function parseHallEntry(row: LedgerRow): HallSubmission | null {
  if (row.stage !== HALL_STAGE) return null;
  if (row.siteId && row.siteId !== SITE_ID) return null;
  if (typeof row.notes !== "string" || !row.notes) return null;
  let wire: unknown;
  try {
    wire = JSON.parse(row.notes);
  } catch {
    return null;
  }
  if (typeof wire !== "object" || wire === null) return null;
  const w = wire as Partial<HallNoteWire>;
  if (w.v !== 1 || w.kind !== "hall") return null;
  const name = sanitizeName(w.name);
  if (!name) return null;
  const modelVersion = typeof row.modelVersion === "string" ? row.modelVersion : "";
  const candidate = {
    effectiveRank: w.er,
    maxPossibleRank: w.mr,
    utilization: w.u,
    samples: w.s,
    dims: w.d,
    modelVersion,
  };
  if (!validMeasurement(candidate)) return null;
  return {
    name,
    effectiveRank: w.er as number,
    maxPossibleRank: w.mr as number,
    utilization: w.u as number,
    samples: w.s as number,
    dims: w.d as number,
    modelVersion,
    ts: row.ts,
  };
}

export type HallFeed = {
  /** false ⇒ core-api unreachable or no server key — render the honest
   * offline state, never an empty board pretending to be live. */
  online: boolean;
  submissions: HallSubmission[];
  window: number;
};

/** Server-side read for the /hall page. Sorted most-collapsed first
 * (lowest utilization) — the Hall of Cone celebrates the cone. */
export async function fetchHallSubmissions(): Promise<HallFeed> {
  if (!hasCoreApi()) return { online: false, submissions: [], window: LEDGER_WINDOW };
  try {
    const data = (await apiFetch(`/v1/ledger?limit=${LEDGER_WINDOW}`)) as {
      entries?: LedgerRow[];
    } | null;
    const rows = Array.isArray(data?.entries) ? data.entries : [];
    const submissions = rows
      .map(parseHallEntry)
      .filter((s): s is HallSubmission => s !== null)
      .sort((a, b) => a.utilization - b.utilization);
    return { online: true, submissions, window: LEDGER_WINDOW };
  } catch {
    return { online: false, submissions: [], window: LEDGER_WINDOW };
  }
}
