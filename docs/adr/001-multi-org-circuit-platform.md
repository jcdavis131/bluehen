# ADR-001: Multi-Org Platform Architecture

**Status:** Accepted (partial — deployment automation Proposed)  
**Date:** 2026-06-27  
**Deciders:** Platform / Operator  
**Related:** `PLAN.md` §3, Specs 0002, 0006, 0007, 0012, `docs/VOICE_AND_PLATFORM.md`

## Context

Blue Hen RE (SynthaEmbed OS) runs **multiple mini-organizations** — each with its own domain,
workspace, corpus, embedding model, and public site — inside one monorepo. Existing Vercel
properties (bhenre.com, slasso.com, arxiviq.com, dumbmodel.com, jcamd.com) must become
first-class fleet tenants without fragmenting the shared ASN engine or eval gates.

Forces at play:

- **Repurpose, don't rewrite** — legacy sites become product surfaces, not greenfield apps.
- **Zero-trust between orgs** — tenants must not read each other's corpora, models, or vectors.
- **One honest engine** — ASN training, eval-harness gates, and EVIDENCE.md apply fleet-wide.
- **Synthetic org model** — five functional divisions (Data, Research, BD, Execution,
  Orchestration) hand off work continuously; the product model is **The Operating Loop**
  (Measure · Validate · Deploy · Improve).
- **Small team, spec-driven** — operational complexity must stay low through Phase A.
- **Polyglot reality** — Next.js on Vercel for edges; PyTorch/FastAPI for ML and API.

We need a platform shape that supports N public sites, N isolated workspaces, one closed
improvement loop, and data-only onboarding of new orgs.

## Decision

Adopt a **hub-and-spoke circuit architecture**:

1. **One polyglot monorepo** (Turborepo + pnpm for JS; uv for Python).
2. **One platform chokepoint** — `services/core-api` (FastAPI) is the only mutation/read API
   for tenancy, data, train, eval, deploy, search, ledger, and trace.
3. **One Postgres 16 + pgvector database** with **Row-Level Security** per `workspace_id`;
   defense-in-depth via app-layer key resolution + `SET LOCAL ROLE synthaembed_tenant`.
4. **N Vercel projects** from the same repo — one Next.js deploy per fleet site, each bound
   to exactly one workspace API key (`SYNTH_API_KEY`).
5. **Logical org divisions** (Spec 0012) — not separate microservices; handoffs signaled
   via **Race Log** (`auto_research_ledger` stages), not a distributed event bus (Phase A).
6. **Shared experience layer** — `@synthaembed/ui-fleet` + `@synthaembed/fleet` registry
   and narrative; sites differ by division emphasis and content, not separate design systems.
7. **Platform services off Vercel** — `core-api` and `worker` on **Railway** (ADR-002);
   `trainer` on Modal GPU when Spec 0011 lands; Neon Postgres via Vercel integration for
   shared `DATABASE_URL`.

```
Vercel (N site projects) ──▶ synth-core / BFF routes ──▶ core-api (Railway) ──▶ Neon (RLS)
                                                              │
                                                         worker (Railway) ──▶ trainer (Modal)
Eve (synthorg) / CLI / Operations Center (admin) ────────────────┘
```

## Options Considered

### Option A: Per-Site Repos + Per-Tenant Databases

| Dimension | Assessment |
|-----------|------------|
| Complexity | High — N repos, N schemas, N CI pipelines |
| Cost | High — duplicated infra and drift risk |
| Scalability | Good isolation at infra level |
| Team familiarity | Low — fights current monorepo investment |

**Pros:** Hard blast-radius boundaries; independent release cadence per site.  
**Cons:** Cannot enforce “one engine, many orgs”; eval gates and ASN changes fragment;
  repurposing existing sites into fleet is painful; Eve cannot orchestrate cross-site.

### Option B: Single Vercel App + Path-Based Tenants (`/org/slasso`)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low ops |
| Cost | Low |
| Scalability | Moderate |
| Team familiarity | High |

**Pros:** One deploy, one env surface, simple routing.  
**Cons:** Loses locked custom domains as first-class identities; weak marketing topology
  (dumbmodel vs bhenre brand separation); couples all sites to one release; hurts the
  per-surface product story.

### Option C: Microservices per Division (data-svc, research-svc, bd-svc, …)

| Dimension | Assessment |
|-----------|------------|
| Complexity | High |
| Cost | Medium–High |
| Scalability | Good independent scaling per division |
| Team familiarity | Low at current team size |

**Pros:** Aligns org chart to deploy units; scale Qualifying (BD) independently.  
**Cons:** Overhead before division load justifies it; cross-division handoffs need
  distributed tracing and contracts; contradicts Spec 0012 (“divisions are logical, not
  infra silos”).

### Option D: Event Bus (Kafka / SQS / Redis Streams) for Handoffs

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium–High |
| Cost | Medium (Kafka) / Low (SQS) / Low (Redis) |
| Scalability | Excellent for async fan-out |
| Team familiarity | Medium |

**Pros:** Real-time division reactions; decouples producers/consumers; natural for
  feedback → auto fuel-request loops.  
**Cons:** Phase A handoffs are low-frequency and audit-critical; ledger already provides
  immutable stage log; adds infra before throughput requires it.

### Option E: Accepted — Monorepo + core-api + RLS + N Vercel Projects + Ledger Handoffs

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium (concentrated in core-api + fleet registry) |
| Cost | Low Phase A — one Neon DB, scale-to-zero GPU |
| Scalability | Good to ~50 orgs; revisit vector partition / API split later |
| Team familiarity | High — matches specs 0002, 0007, 0012 already implemented |

**Pros:** Data-only onboarding; repurposed domains; uniform SDK; Eve + CLI simplicity;
  RLS tested in CI; circuit narrative across sites.  
**Cons:** core-api blast radius; env drift across N Vercel projects; ledger polling
  latency for orchestration; single Postgres noisy-neighbor risk at scale.

## Trade-off Analysis

| Tension | Choice | Rationale |
|---------|--------|-----------|
| Isolation vs simplicity | RLS single DB | Spec 0002 + negative tests; revisit Qdrant/per-tenant only when vector TB or compliance demands |
| Release independence vs shared engine | N Vercel projects, one API | Sites ship UX independently; engine version unified via monorepo |
| Org chart vs infra | Logical divisions + ledger | Divisions map to agent roles and UI copy, not deploy units — avoids premature microservices |
| Sync handoffs vs event bus | Ledger stages (Phase A) | Audit trail and human-readable Race Log beat sub-second reactivity for current volume |
| Edge vs compute | Vercel sites / hosted API | PyTorch cannot run on Vercel; embed/search proxied through BFF with workspace key |

**Kafka vs SQS (event bus deferral):** Neither is chosen for Phase A. The ledger +
`POST /v1/ledger` + Eve polling is sufficient when handoffs are human/agent-paced
(minutes, not milliseconds). If feedback-driven auto-routing needs sub-second reaction,
**Redis Streams** (already in `.env.example`) is the preferred first event layer — same
ops footprint as future Arq job queue, no new vendor. **SQS** if fully managed and
API/worker are AWS-hosted. **Kafka** only if multiple external consumers need durable
replay at high volume (unlikely before Phase C external tenants).

## Consequences

### Positive

- New mini-org onboarding: edit `config/fleet.json` → `bootstrap:orgs` → Vercel env — no code change.
- Fleet-wide orchestration (Eve, Operations Center) via one admin API and one SDK.
- Public funnel preserved: Baseline Comparison → Validation Lab → Platform Console → Applied Research.
- Evidence and eval gates stay centralized and normative.

### Negative

- **N× Vercel project maintenance** — root directory, env vars, domains per site; needs automation script.
- **core-api availability** — all sites degrade if API is down; requires health checks and status banners (implemented).
- **Secret distribution** — per-site `SYNTH_API_KEY` must never land in client bundles; BFF pattern is mandatory.
- **Ledger latency** — closed loop is batch-oriented; reactive auto-routing deferred.

### Revisit When

| Trigger | Likely change |
|---------|----------------|
| >50 active workspaces or vector >1 TB | pgvector partitioning, Qdrant escape hatch, read replicas |
| Search/embed p95 SLO diverges from train SLO | Split read path (embed service) from core-api |
| Feedback volume needs instant routing | Redis Streams or SQS on top of ledger (ledger remains audit source) |
| External self-serve tenants (Phase C) | Hub SSO + provisioning API; keep workspace keys for automation |
| BD exam CPU dominates | Extract exam runner worker pool, not full bd-svc |

## Action Items

1. [x] Fleet registry (`config/fleet.json`) + org divisions (`config/org-divisions.json`)
2. [x] Workspace RLS + bootstrap script (Spec 0002)
3. [x] N site apps + shared ui-fleet + enterprise platform narrative
4. [x] Live search + operations feedback → ledger `feedback` stage
5. [ ] **Deploy platform host** — Railway `core-api` + `worker` against Neon (`INF-003`);
   runbook [`infra/railway.md`](../../infra/railway.md), ADR-002
6. [ ] **Multi-project Vercel bootstrap script** — `pnpm vercel:link-fleet:exec` +
   `pnpm vercel:env-fleet:exec` (scripts landed; Operator execution pending)
7. [ ] Modal trainer production path (Spec 0011) wired to worker dispatch
8. [ ] YAML qualifying exam runner on slasso (Phase A BD automation)
9. [x] Document runbook — `infra/railway.md`, `HANDOFF.md` §6 prod deploy, ADR-002

## Supersedes

- Ad-hoc “one site per repo” assumptions in pre-fleet archive docs (`docs/sources/archive-plan-pre-fleet.md`).

## Notes

- **RE** dual meaning: Relay Engine (org brand) / RAG Embeddings (technical) — see `docs/VOICE_AND_CIRCUIT.md`.
- Bootstrap for this architecture is **multi-project**, not single `.vercel/project.json`; see system design discussion in session 2026-06-27.
