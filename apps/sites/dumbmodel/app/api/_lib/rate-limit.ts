import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function prune(now: number) {
  if (buckets.size < 4096) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "anon";
}

/** In-memory sliding window per key (per serverless instance). */
export function rateLimit(
  key: string,
  limit: number,
  windowS: number,
): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  prune(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowS * 1000 });
    return { ok: true };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { ok: true };
}

export function arenaRateLimit(req: NextRequest, userRef?: string) {
  const ip = clientIp(req);
  const ipLimit = Number(process.env.ARENA_RATE_LIMIT_IP ?? 40);
  const refLimit = Number(process.env.ARENA_RATE_LIMIT_REF ?? 80);
  const windowS = Number(process.env.ARENA_RATE_WINDOW_S ?? 60);

  const ipCheck = rateLimit(`arena:ip:${ip}`, ipLimit, windowS);
  if (!ipCheck.ok) return ipCheck;

  if (userRef) {
    const refCheck = rateLimit(`arena:ref:${userRef}`, refLimit, windowS);
    if (!refCheck.ok) return refCheck;
  }

  return { ok: true as const };
}
