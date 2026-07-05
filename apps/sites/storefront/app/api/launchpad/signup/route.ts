import { NextRequest, NextResponse } from "next/server";
import { errorJson, upstreamDetail } from "../_shared";

/** Spec 0034 §2: self-serve signup is the PUBLIC front door — unlike every
 * other launchpad route, /v1/signup takes no auth header (there's no key
 * yet; this call is what issues one). So this proxy does NOT go through
 * launchpadFetch (which always attaches the sandbox bearer key) — it forwards
 * the caller's IP via x-forwarded-for instead, which is what core-api's
 * per-IP signup rate limit (3/day) keys off. */

function apiBaseUrl(): string {
  return process.env.SYNTH_API_BASE_URL ?? "http://localhost:8000";
}

export async function POST(req: NextRequest) {
  try {
    let raw: unknown = {};
    try {
      raw = await req.json();
    } catch {
      raw = {};
    }
    const { name, email } = (raw as { name?: unknown; email?: unknown }) ?? {};

    // Vercel (and most proxies) already set x-forwarded-for on the incoming
    // request — relay it as-is so core-api sees the real caller IP, not this
    // server's own address.
    const forwardedFor = req.headers.get("x-forwarded-for");

    const res = await fetch(`${apiBaseUrl()}/v1/signup`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      },
      body: JSON.stringify({
        name: typeof name === "string" && name.trim() ? name.trim() : undefined,
        email: typeof email === "string" && email.trim() ? email.trim() : undefined,
      }),
      cache: "no-store",
    });

    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    if (!res.ok) {
      return errorJson(res.status, upstreamDetail(body, "could not issue a key"));
    }
    return NextResponse.json(body, { status: res.status });
  } catch (e) {
    return errorJson(500, e instanceof Error ? e.message : "unexpected error");
  }
}
