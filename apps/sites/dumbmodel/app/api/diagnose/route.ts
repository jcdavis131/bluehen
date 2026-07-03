import { NextRequest, NextResponse } from "next/server";
import { POST_diagnose } from "@synthaembed/ui-fleet/routes";

// REV-903 follow-up: soft per-IP rate limit on the public diagnose BFF so the
// loud front door can be promoted without being a free compute firehose. This
// is an in-memory sliding-window guard (per-instance on Node serverless, per-
// region on edge) — a real abuse brake before promotion, not a hard Redis-backed
// limit. Tune via env; default 10 calls / 60s per IP.
const LIMIT = Number(process.env.DIAGNOSE_RATE_LIMIT ?? 10);
const WINDOW_S = Number(process.env.DIAGNOSE_RATE_WINDOW_S ?? 60);

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Bound memory: drop expired buckets occasionally so a busy public endpoint
// can't grow the map without limit.
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
  return POST_diagnose(req);
}
