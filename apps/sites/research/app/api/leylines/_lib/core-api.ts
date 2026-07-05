/**
 * Leylines BFF -> core-api bridge (Spec 0031 §2/§7, GAME-003). Same pattern
 * as dumbmodel's arena/_lib/core-api.ts: research's own workspace key,
 * bearer-authed, server-only, never exposed to the client.
 */
const BASE_URL = process.env.SYNTH_API_BASE_URL ?? "http://localhost:8000";

export class CoreApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function coreApiFetch(path: string, init?: RequestInit): Promise<unknown> {
  const apiKey = process.env.SYNTH_API_KEY;
  if (!apiKey) {
    throw new CoreApiError("SYNTH_API_KEY not set for research's workspace", 503);
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const raw = await res.text();
  let data: unknown = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }
  if (!res.ok) {
    const detail =
      data && typeof data === "object" && "detail" in (data as Record<string, unknown>)
        ? String((data as Record<string, unknown>).detail)
        : raw || `${res.status}`;
    throw new CoreApiError(detail, res.status);
  }
  return data;
}
