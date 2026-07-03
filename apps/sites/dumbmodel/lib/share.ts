import type { DiagnoseResult } from "@synthaembed/ui-fleet";

/**
 * Stateless share permalinks for health-check results (Spec 0020, UX-122).
 *
 * The diagnose API stores nothing, so the shareable page carries its own
 * data: a compact, base64url-encoded snapshot of the measured result in the
 * `d` query param. Only the fields the summary + OG card need are encoded —
 * never the submitted text. Decoding validates every field; anything
 * malformed renders an honest error, never a fabricated score.
 *
 * Isomorphic on purpose (btoa/atob + TextEncoder are globals in both the
 * browser and Node 18+): the panel encodes client-side, the result page and
 * its generateMetadata decode server-side.
 */

/** Compact wire shape — short keys keep the permalink short. */
type ShareWire = {
  /** effectiveRank */ er: number;
  /** maxPossibleRank */ mr: number;
  /** utilization (0–1] */ u: number;
  /** meanPairwiseSimilarity */ ps: number;
  /** samples */ s: number;
  /** dims */ d: number;
  /** modelVersion */ m: string;
};

export type ShareResult = {
  effectiveRank: number;
  maxPossibleRank: number;
  utilization: number;
  meanPairwiseSimilarity: number;
  samples: number;
  dims: number;
  modelVersion: string;
};

const round = (v: number, digits: number) => Number(v.toFixed(digits));

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(encoded: string): string | null {
  if (!/^[A-Za-z0-9_-]{1,512}$/.test(encoded)) return null;
  const b64 =
    encoded.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (encoded.length % 4)) % 4);
  try {
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Single set of wire invariants, enforced on BOTH sides: the encoder refuses
 * to mint a link the decoder would brand malformed (e.g. a degenerate API
 * response), and the decoder rejects anything outside what the diagnose
 * endpoint can actually produce (it hard-caps input at 64 texts).
 */
function validWire(w: Partial<ShareWire>): w is ShareWire {
  if (!finite(w.er) || !finite(w.mr) || !finite(w.u) || !finite(w.ps)) return false;
  if (!finite(w.s) || !Number.isInteger(w.s) || w.s < 3 || w.s > 64) return false;
  if (!finite(w.d) || !Number.isInteger(w.d) || w.d < 1 || w.d > 65536) return false;
  if (typeof w.m !== "string" || w.m.length === 0 || w.m.length > 48) return false;
  if (w.u <= 0 || w.u > 1) return false;
  if (w.er <= 0 || w.mr <= 0 || w.er > w.mr + 0.05) return false;
  if (w.ps < -1 || w.ps > 1) return false;
  return true;
}

/**
 * Encode a measured diagnose result into the `d` permalink param.
 * Returns null when the result can't be represented honestly (missing,
 * non-finite, or out-of-range fields) — callers hide the share affordance
 * instead of minting a link the result page would reject as malformed.
 * Defensive on purpose: the BFF proxies upstream JSON without shape
 * validation, so a drifted 200 response must not crash the panel render.
 */
export function encodeShareParam(result: DiagnoseResult): string | null {
  const r = result as Partial<DiagnoseResult> | null;
  if (!r || typeof r.modelVersion !== "string") return null;
  if (!finite(r.effectiveRank) || !finite(r.maxPossibleRank) || !finite(r.utilization)) return null;
  if (!finite(r.meanPairwiseSimilarity) || !finite(r.samples) || !finite(r.dims)) return null;
  const wire: ShareWire = {
    er: round(r.effectiveRank, 1),
    mr: round(r.maxPossibleRank, 1),
    u: round(r.utilization, 4),
    ps: round(r.meanPairwiseSimilarity, 4),
    s: r.samples,
    d: r.dims,
    // Code-point slice so a 48th-position surrogate pair can't be split.
    m: [...r.modelVersion].slice(0, 48).join(""),
  };
  if (!validWire(wire)) return null;
  return toBase64Url(JSON.stringify(wire));
}

/**
 * Decode + validate a `d` param. Returns null on anything malformed —
 * missing fields, non-finite numbers, repeated params (string[]), or values
 * outside what the diagnose endpoint can actually produce.
 */
export function decodeShareParam(encoded: string | string[] | undefined): ShareResult | null {
  if (typeof encoded !== "string" || !encoded) return null;
  const json = fromBase64Url(encoded);
  if (!json) return null;
  let wire: unknown;
  try {
    wire = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof wire !== "object" || wire === null) return null;
  const w = wire as Partial<ShareWire>;
  if (!validWire(w)) return null;
  return {
    effectiveRank: w.er,
    maxPossibleRank: w.mr,
    utilization: w.u,
    meanPairwiseSimilarity: w.ps,
    samples: w.s,
    dims: w.d,
    modelVersion: w.m,
  };
}

/** Collapse score shown on the OG card — same derivation the panel used. */
export function collapseScore(utilization: number): number {
  return Math.round((1 - utilization) * 100);
}

/** Query string for the existing /api/og card, from a decoded share. */
export function ogQueryFor(share: ShareResult): string {
  const p = new URLSearchParams({
    erank: String(share.effectiveRank),
    util: String(share.utilization),
    model: share.modelVersion,
    score: String(collapseScore(share.utilization)),
    samples: String(share.samples),
  });
  return p.toString();
}

/** Measured-utilization verdict — single source shared by panel + share page. */
export function verdictFor(utilization: number): string {
  return utilization < 0.3
    ? "Your samples cluster tightly — retrieval over content like this will struggle to distinguish documents. A domain-tuned model typically recovers usable rank."
    : utilization < 0.6
      ? "Moderate spread. There is measurable headroom — domain tuning usually widens separation on content like this."
      : "Healthy spread — your content occupies a large share of the embedding space under the serving model.";
}
