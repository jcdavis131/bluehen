"""Catalog load probe (Spec 0018 DR-106).

Measures, from one client IP:
1. latency percentiles for /v1/catalog/stats and /datasets under the
   per-IP rate limit (the honest single-origin measurement),
2. cache-header presence (the CDN-scale posture), and
3. that the 429 limiter actually engages past its threshold.

A single-IP probe cannot measure origin throughput beyond the limiter —
that is by design (public fan-out is absorbed by CDN caching), and the
EVIDENCE row says so.

Usage: uv run python scripts/load_probe_catalog.py [--n 100] [--conc 8]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import statistics
import time

import httpx

BASE = "https://api-production-3dea.up.railway.app"


async def timed_get(client: httpx.AsyncClient, path: str) -> tuple[float, int, dict]:
    t0 = time.perf_counter()
    r = await client.get(f"{BASE}{path}")
    return (time.perf_counter() - t0) * 1000, r.status_code, dict(r.headers)


async def probe(path: str, n: int, conc: int) -> dict:
    sem = asyncio.Semaphore(conc)
    results: list[tuple[float, int, dict]] = []

    async with httpx.AsyncClient(timeout=30) as client:
        async def one():
            async with sem:
                results.append(await timed_get(client, path))

        await asyncio.gather(*(one() for _ in range(n)))

    lat = sorted(ms for ms, code, _ in results if code == 200)
    codes: dict[int, int] = {}
    for _, code, _ in results:
        codes[code] = codes.get(code, 0) + 1
    cache = results[0][2].get("cache-control", "(none)")
    out = {
        "path": path,
        "requests": n,
        "concurrency": conc,
        "statusCounts": codes,
        "cacheControl": cache,
    }
    if lat:
        out.update({
            "p50Ms": round(statistics.median(lat), 1),
            "p95Ms": round(lat[max(0, int(len(lat) * 0.95) - 1)], 1),
            "maxMs": round(lat[-1], 1),
        })
    return out


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=100)
    ap.add_argument("--conc", type=int, default=8)
    args = ap.parse_args()

    stats = await probe("/v1/catalog/stats", args.n, args.conc)
    listing = await probe("/v1/catalog/datasets?limit=20", 15, 4)
    print(json.dumps({"stats": stats, "datasets": listing}, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
