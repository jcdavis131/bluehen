# ADR-002: Production Host for core-api and Worker

**Status:** Accepted  
**Date:** 2026-06-28  
**Deciders:** Operator (hosting), Platform (implementation)  
**Related:** ADR-001, Specs 0002, 0005, 0009, `infra/railway.md`, `TASKS.md`, `HANDOFF.md` §7

## Context

Blue Hen RE runs a **hub-and-spoke** architecture (ADR-001): N Next.js sites on **Vercel**, one
**FastAPI** chokepoint (`services/core-api`), and a **long-polling ASN worker**
(`services/worker`) that claims jobs from Postgres and runs training/eval/deploy locally.
Production Postgres is **Neon** (via Vercel integration); GPU training will eventually move to
**Modal** (Spec 0011), but Phase A still needs an always-on worker on CPU.

Forces at play:

- **Two always-on processes** — HTTP API for all site BFFs; worker loop (`run_forever`, 2s poll)
  cannot scale to zero between jobs.
- **Small team, ship now** — Phase A has ~4 tenants, low RPS; ops burden matters more than
  multi-region latency.
- **Vercel edge is locked** — sites stay on Vercel; only backend compute is in question.
- **Artifact persistence** — worker writes checkpoints under `ARTIFACTS_DIR`; host must provide
  durable disk or external object storage soon.
- **Future Redis/Arq** — `.env.example` includes `REDIS_URL`; not wired today. Host should allow
  adding a Redis add-on without migration.

We need a container host for **core-api + worker + (optional) Redis** that connects to Neon
`DATABASE_URL` and exposes a stable HTTPS origin for all Vercel projects.

## Decision

Deploy **two Railway services** from the monorepo — `core-api` (web) and `worker`
(background) — with **Neon Postgres** external and **Upstash Redis** added when Arq handoffs
land.

Railway is the Phase A default: fastest path to prod for a two-service Python stack with
GitHub deploys and managed add-ons, with a clean escape path to Fly.io if multi-region or
volume semantics become necessary.

```
Vercel (N sites) ──▶ core-api (Railway) ──▶ Neon Postgres
                         ▲
                    worker (Railway) ──────┘
                         │
                    Modal (GPU, later)
```

## Options Considered

### Option A: Fly.io

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium — `fly.toml`, machines, volumes |
| Cost | Low–medium at Phase A scale |
| Scalability | Strong — multi-region, independent machine scaling |
| Team familiarity | Medium |

**Pros:** First-class always-on workers; persistent volumes for `ARTIFACTS_DIR`; mature health
checks.  
**Cons:** More infra to own; steeper bootstrap than Railway for Phase A speed.

### Option B: Railway (Accepted)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Cost | Low at Phase A; usage-based |
| Scalability | Good to moderate scale |
| Team familiarity | High |

**Pros:** Fastest path from Dockerfile → prod; two services + env groups map cleanly to
API/worker; simple Neon + Upstash wiring.  
**Cons:** Artifact persistence needs explicit volume or S3; less multi-region control.

### Option C: Render

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Cost | Low on paid always-on tier |
| Scalability | Moderate |
| Team familiarity | Medium |

**Pros:** Clear Web Service + Background Worker split.  
**Cons:** Free tier spin-down breaks worker; disk persistence less ergonomic than Fly volumes.

## Trade-off Analysis

| Tension | Railway (accepted) | Fly.io | Render |
|---------|-------------------|--------|--------|
| Time to prod | **Best** | Medium | Good |
| Worker always-on | Yes | Yes | Yes (paid) |
| Artifact storage | Volume or S3 soon | Native volumes | Paid disk |
| Multi-region API | Defer | **Best** | Single region default |
| Future Redis/Arq | Upstash plugin | Fly Redis or Upstash | Render or Upstash |

**Modal relationship:** Modal remains the **GPU trainer** (Spec 0011). The container worker
stays for job orchestration, CPU fallback, eval, and deploy until Modal dispatch is wired.

## Consequences

### Positive

- Unblocks Neon prod cutover and multi-project Vercel bootstrap (per-site `SYNTH_API_BASE_URL`).
- Single platform dashboard for API + worker env vars.
- Keeps ADR-001 ledger-handoff model unchanged (Postgres polling, no Kafka yet).

### Negative

- **New vendor** alongside Vercel + Neon + Modal.
- **Artifact strategy still required** — plan Railway volume or `MODEL_REGISTRY_URI=s3://…` before
  first prod train job.
- **Worker sizing** — PyTorch CPU training needs adequate RAM (≥4 GB recommended for Phase A).

### Revisit When

| Trigger | Likely change |
|---------|----------------|
| API p95 SLO needs edge-adjacent regions | Migrate API to Fly.io multi-region |
| Artifact storage > local disk comfort | S3-compatible registry |
| Worker CPU saturates before Modal wired | Accelerate Modal path or GPU worker pool |
| Feedback routing needs sub-second | Add Redis Streams (ADR-001) |

## Action Items

1. [x] Shared `Dockerfile` + `infra/docker-entrypoint.sh` (api / worker / migrate)
2. [x] Deploy runbook — `infra/railway.md`
3. [ ] Create Railway project: services `core-api` and `worker` from same repo
4. [ ] Wire Neon prod `DATABASE_URL`; run `migrate` release step
5. [ ] Set `SYNTH_API_BASE_URL` on all Vercel fleet projects
6. [ ] Push per-site keys via `pnpm bootstrap:orgs` → Vercel env (ADR-001 #6)
7. [ ] Decide artifact persistence: Railway volume vs S3 before first prod train job
8. [ ] Mark ADR-001 action #5 complete after first prod health check passes

## Supersedes

- Open-ended “Fly vs Railway vs Render” in `TASKS.md` Waiting On (resolved 2026-06-28).
