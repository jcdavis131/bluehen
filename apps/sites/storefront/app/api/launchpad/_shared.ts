/**
 * Spec 0027 — Launchpad BFF shared helpers. Server-only: the sandbox key
 * never reaches the client. Every route in app/api/launchpad/* imports from
 * here rather than talking to core-api directly, so the auth + error
 * shape stay identical across contract/corpus/status/recommend.
 */
import { NextResponse } from "next/server";

/** One concurrent sandbox run per session (Spec 0027 §3 rate/abuse). The
 * cookie's own maxAge IS the 15-minute throttle window — if it's present,
 * it's younger than 15 min by construction. */
export const RUN_COOKIE = "lp_run";
export const RUN_COOKIE_MAX_AGE_S = 15 * 60;

/** Long-lived per-browser session id — not a security boundary, just the
 * `lp-<8char>-` corpus name prefix so sandbox uploads are traceable to a
 * session for the nightly purge tick. */
export const SESSION_COOKIE = "lp_sid";
export const SESSION_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 30;

function apiConfig() {
  const baseUrl = process.env.SYNTH_API_BASE_URL ?? "http://localhost:8000";
  const apiKey = process.env.SANDBOX_API_KEY ?? process.env.SYNTH_API_KEY ?? "";
  return { baseUrl, apiKey };
}

export type UpstreamResult = { ok: boolean; status: number; body: unknown };

/** Proxies one call to core-api with the sandbox (or fallback) key. Never
 * throws on a non-2xx response — callers inspect `ok`/`status`/`body` so
 * the upstream's human-readable `detail` string can be relayed verbatim. */
export async function launchpadFetch(path: string, init?: RequestInit): Promise<UpstreamResult> {
  const { baseUrl, apiKey } = apiConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const raw = await res.text();
  let body: unknown = null;
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = raw;
    }
  }
  return { ok: res.ok, status: res.status, body };
}

/** core-api's error responses are RFC 9457 problem+json: {detail: "..."}.
 * That detail string is designed to be human-readable — relay it as-is. */
export function upstreamDetail(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "detail" in (body as Record<string, unknown>)) {
    const detail = (body as Record<string, unknown>).detail;
    if (typeof detail === "string" && detail) return detail;
    if (detail != null) return JSON.stringify(detail);
  }
  if (typeof body === "string" && body.trim()) return body;
  return fallback;
}

export function errorJson(status: number, detail: string) {
  return NextResponse.json({ error: detail }, { status });
}

export function randomSessionId(): string {
  // 8 lowercase-hex chars — matches the `lp-<8char>-` prefix the spec calls for.
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
