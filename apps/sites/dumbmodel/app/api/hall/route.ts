import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@synthaembed/ui-fleet/site-api";
import {
  encodeHallNote,
  HALL_STAGE,
  sanitizeName,
  SITE_ID,
  validMeasurement,
} from "../../../lib/hall";

/**
 * Hall of Cone submission BFF (Spec 0020, UX-121).
 *
 * Accepts a consented, anonymous score from the /check result and persists
 * it as an Operations Ledger entry (core-api POST /v1/ledger, stage
 * `hall-submission`) using the server-side SYNTH_API_KEY. The /hall page
 * reads the same ledger back — one real store, no shadow copies.
 *
 * Every field is validated against the envelope /v1/diagnose can actually
 * produce (same invariants as the share permalink); anything out of range
 * is rejected, not clamped into a plausible-looking score. Only a display
 * name + measured numbers are stored — no email, IP, or account identity.
 */

// Same in-memory soft rate limit pattern as /api/diagnose — a real abuse
// brake per instance, not a distributed guarantee.
const LIMIT = Number(process.env.HALL_RATE_LIMIT ?? 5);
const WINDOW_S = Number(process.env.HALL_RATE_WINDOW_S ?? 60);

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function prune(now: number) {
  if (buckets.size < 4096) return;
  for (const [ip, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(ip);
  }
}

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "anon";
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const now = Date.now();
  prune(now);
  const ip = clientIp(req);
  const b = buckets.get(ip);
  if (!b || b.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_S * 1000 });
  } else {
    b.count += 1;
  }
  const current = buckets.get(ip)!;
  if (current.count > LIMIT) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "rate_limited", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (body.consent !== true) {
    return NextResponse.json({ error: "consent required" }, { status: 400 });
  }
  const name = sanitizeName(body.name);
  if (!name) {
    return NextResponse.json({ error: "display name required (1–48 characters)" }, { status: 400 });
  }
  const measurement = {
    effectiveRank: body.effectiveRank,
    maxPossibleRank: body.maxPossibleRank,
    utilization: body.utilization,
    samples: body.samples,
    dims: body.dims,
    modelVersion: body.modelVersion,
  };
  if (!validMeasurement(measurement)) {
    return NextResponse.json(
      { error: "score outside the measurable envelope — submit an unmodified /check result" },
      { status: 400 },
    );
  }

  try {
    await apiFetch("/v1/ledger", {
      method: "POST",
      body: JSON.stringify({
        stage: HALL_STAGE,
        siteId: SITE_ID,
        modelVersion: measurement.modelVersion,
        notes: encodeHallNote({
          name,
          effectiveRank: measurement.effectiveRank as number,
          maxPossibleRank: measurement.maxPossibleRank as number,
          utilization: measurement.utilization as number,
          samples: measurement.samples as number,
          dims: measurement.dims as number,
          modelVersion: measurement.modelVersion as string,
        }),
      }),
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("SYNTH_API_KEY") ? 503 : 502;
    return NextResponse.json(
      { error: "leaderboard backend not reachable — nothing was stored" },
      { status },
    );
  }
}
