# Blue Hen RE — Architecture & Spec-Driven Development Plan

> **Blue Hen RE** (*RE* = RAG Embeddings). Codename **bluehenre**; platform layer **SynthaEmbed OS**.
> This document is the single source of truth for *what* we are
> building and *how* we build it. It is written to be read top-to-bottom once, then used
> as a reference. Every line of code in this repo should trace back to a spec in
> [`specs/`](./specs), and every spec should trace back to a goal in this plan.

---

## 1. The synthesis: three conversations → one platform

You brought three threads. They are not three projects; they are three layers of one product.

| Source | What it really is | Role in the platform | Authoring doc |
|---|---|---|---|
| **AwakenedSleepNet (ASN)** whitepaper | A training *method* for collapse-resistant embeddings (effective-rank monitoring, spectral surgery, Newton-Schulz orthogonalization, info-bottleneck projection head) | **The engine.** Every mini-org trains with ASN. | [Google Doc 1](https://docs.google.com/document/d/1IN2CBSPX3u46zamPljzcOGOeXMM6V54d9FNZ6QmEeqQ/edit) → [`WHITEPAPER.md`](./WHITEPAPER.md) |
| **SynthaEmbed OS** | A *platform* wrapper: an autonomous "synthetic organization" with an LLM-orchestrated auto-research hill-climbing loop, multi-tenant workspaces, Vercel + FastAPI + PyTorch | **The operating system.** Tenancy, the auto-research Conductor, serving, dashboards. | [Google Doc 2](https://docs.google.com/document/d/1yLCSROVTfqjZpdVz7vqf3yuN_HbMo7GjdY1_XO7Q7-Q/edit) → [`PLAN.md`](./PLAN.md), specs `0004`–`0009` |
| **Embedding Co. MTNN** | An *applied vertical*: a multi-task multimodal network (MoE trunk, aux heads, differentiable-Sharpe portfolio head) | **The reference mini-org.** Proves the template end-to-end on a hard domain (finance). | [Google Doc 3](https://docs.google.com/document/d/14Rtz1r_3AQIM8cChKVsjPqt8kHH6PqV6RWPIEkH10Ik/edit) → spec [`0010`](./specs/0010-finance-applied-test.md) |

Additional authoring docs: [Doc 4](https://docs.google.com/document/d/1BjyQqI7gq5c52d576LNiejjqMrYNvfq8bG3ptOps7Zw/edit) (ASN integration manual),
[Doc 5](https://docs.google.com/document/d/12kAuscAIsTL6CEnAgo1OZT22hKXzz9fcOerkafHEAOI/edit) (Embedding Co lifecycle) — archived in
[`docs/sources/`](./docs/sources/) · see [`docs/SOURCE_MAP.md`](./docs/SOURCE_MAP.md).

**The unifying idea (your "mini-organizations"):** a mini-org is an autonomous tenant that
owns its own *site*, *API surface*, and *interactions* (data ingestion → training →
evaluation → serving), all running the shared ASN engine and Conductor loop, specialized to
one domain. The "four orgs collapsed into one MTNN" from Source 3 is exactly how a single
mini-org works internally: ingestion → shared trunk → eval heads → live head, with the
"gap report between teams" replaced by gradients flowing backward. The platform runs *many*
such mini-orgs side by side with hard isolation between them.

This is also the clean way to **repurpose your existing Vercel sites**: each becomes one
mini-org front-end (`apps/sites/*` + fleet registry), pointed at a scoped
slice of the core API.

---

## 2. Product principles

1. **Production-grade from commit #1.** Auth, tenant isolation, tests, CI, observability,
   and reproducibility are scaffolded before features, not bolted on.
2. **Spec before code.** No feature merges without a spec and acceptance criteria.
   ML changes don't merge without an *evaluation gate* (a metric that must not regress).
3. **The engine is shared; the data is sovereign.** One ASN codebase, N isolated tenants.
   Zero-trust between mini-orgs: separate keys, Postgres row-level security, separate vector
   namespaces, per-tenant cost ceilings.
4. **Honest science.** We ship mechanisms we can verify and measure. Marketing claims like
   "100% scientifically accurate" do not appear in code, docs, or product copy
   (see `SCIENCE_REVIEW.md`).
5. **Cost is a first-class constraint.** The auto-research loop defaults to PEFT and rotates
   its eval sets — both are correctness requirements, not optimizations (Source 2's own
   critique flagged runaway compute and eval overfitting; we design those out).

---

## 3. Architecture

### 3.1 System shape (2026-06-27 — as built)

```
  Vercel (edge)                    Operator + fleet
  ┌─────────────────┐              ┌──────────────────────────────┐
  │ apps/sites/*    │              │ apps/control  → jcamd.com    │
  │ hub · dumbmodel │              │ fleet map · admin status     │
  │ slasso · arxiv  │              └──────────────┬───────────────┘
  └────────┬────────┘                             │
           │  synth-core (TS)                     │
           ▼                                      ▼
        ┌──────────────────────────────────────────────────────┐
        │           core-api (FastAPI v0.3)                     │
        │  workspaces · data · train · eval · deploy · search   │
        │  ledger · trace · budget · RFC 9457 errors            │
        └───┬──────────────────────────────┬───────────────────┘
            │ jobs (Postgres queue)          │ RLS reads/writes
            ▼                                ▼
  ┌──────────────────┐              ┌─────────────────────────┐
  │ services/worker  │              │ Postgres 16 + pgvector  │
  │ ASN train + eval │              │ Redis (cache / future Q) │
  │ deploy + index   │              └─────────────────────────┘
  └────────┬─────────┘
           │ future GPU scale
           ▼
  ┌──────────────────┐     ┌─────────────────────────────────────┐
  │ services/trainer │     │ apps/synthorg (Eve fleet agent)      │
  │ Modal (stub)     │     │ Chief of Staff + lifecycle subagents │
  └──────────────────┘     └─────────────────────────────────────┘
```

All actors (sites, Eve, `synth` CLI, CI) call **only** `core-api` through **`packages/synth-core`**
with propagated `x-synth-*` trace headers (spec 0006).

### 3.2 Components and responsibilities

- **`apps/control`** — operator control plane (`jcamd.com`). Fleet map, cross-org status via
  `/v1/admin/fleet`. Deploys to Vercel.
- **`apps/sites/*`** — one Next.js deploy per locked domain (`hub`, `dumbmodel`,
  `benchmark-lab`, `research-rag`, …). Each binds one workspace API key.
- **`apps/synthorg`** — Eve **Fleet Director**; hill-climb and delegate tools over `synth-core`.
- **`config/fleet.json` + `packages/fleet`** — registry of sites, domains, ports (spec 0007).
- **`services/core-api`** — FastAPI + Pydantic v2 + SQLAlchemy 2.0 + Alembic. Auth (API key +
  admin bearer), tenant RLS, data pipeline, job queue, embed/search, ledger, trace.
- **`services/worker`** — claims train jobs from Postgres, runs ASN + eval-harness, auto-deploys
  and pgvector-indexes chunks (spec 0009). **Production path today.**
- **`services/trainer`** — Modal GPU stub for scale-out training (spec 0005 follow-up).
- **`services/conductor`** — *not a separate service yet*; hill-climb lives in worker +
  Eve tools. LLM recipe generation is spec 0005 partial.
- **`packages/asn-engine`** — spectral surgery, Newton-Schulz (quintic in-loop, cubic for σ→1),
  contrastive losses, `train_loop.py`. See `specs/0003` + `SCIENCE_REVIEW.md` §3.
- **`packages/eval-harness`** — pairwise nDCG@10, effective rank, deploy gates (spec 0008).
- **`packages/eval-public`** — shared baseline panel for dumbmodel.com compare/Hall of Cone.
- **`packages/synth-core` + `packages/cli`** — uniform SDK and `synth` CLI (spec 0006).
- **`packages/ui-fleet`** — shared fleet nav shell for sites and control.

### 3.3 Recommended stack (the "best setup" you asked me to choose)

- **Frontend/edge:** Next.js 15 (App Router), TypeScript (strict), Tailwind, shadcn/ui,
  TanStack Query, Recharts. Hosted on **Vercel**.
- **API:** Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic. **PostgreSQL 16 +
  pgvector** (one database, vectors and metadata together to start; Qdrant is a drop-in
  later via `VECTOR_BACKEND`). **Redis** for the job queue (Arq — async-native, simpler than
  Celery for our shape) and caching.
- **ML:** PyTorch, Hugging Face `transformers`/`tokenizers`, `sentence-transformers` as the
  baseline to beat. Experiment tracking via Weights & Biases (optional, env-gated).
- **Compute:** Vercel for `web`; a container host (Fly.io / Render / Railway) for `core-api`
  and `conductor`; an on-demand GPU provider (Modal / RunPod) for `trainer`. Training is
  bursty, so trainers scale to zero between jobs.
- **Monorepo:** **Turborepo + pnpm** for JS; **uv workspaces** for Python. Polyglot but each
  toolchain stays idiomatic. One repo, one CI, atomic cross-cutting changes.

**Why this and not the alternatives:** separate repos per site would fragment the shared
engine and make the "one engine, many orgs" guarantee impossible to enforce; an all-TS stack
can't host PyTorch training; an all-Python stack gives up Vercel's edge story for the sites
you already have. A polyglot monorepo is the only option that satisfies all three sources at
once.

---

## 4. The mini-organization model (the core abstraction)

A mini-org is defined entirely by data, not by forked code:

- **Identity & isolation:** a `workspace` row, a hashed API key, a Postgres RLS policy keyed
  on `workspace_id`, and a vector namespace. No mini-org can read another's rows or vectors.
- **Site:** a deployment under `apps/sites/<id>` (see `config/fleet.json`) bound to one API key.
- **API surface:** the same core-api routes, scoped by the key — `/embed`, `/search`,
  `/research/*`, `/ledger`, `/models`.
- **Interactions (the loop):** ingestion → ASN training → evaluation → serving, with the
  Conductor driving continuous improvement. Internally this is the MTNN from Source 3:
  multimodal ingestion → shared MoE trunk → auxiliary eval heads → primary task head.
- **Sovereignty controls:** per-tenant cost ceiling, eval-set rotation policy, model
  registry prefix, and rate limits.

Onboarding a new mini-org is an API call + a Vercel deploy, never a code change. That is the
test of whether the abstraction is right.

---

## 5. Spec-driven development workflow

We use a lightweight, enforceable loop. It lives in [`specs/`](./specs).

1. **Write the spec** (`specs/NNNN-name.md`) from the template. It must contain: problem,
   goals, non-goals, API/data contract, acceptance criteria, **test plan**, and — for ML
   work — an **evaluation gate** (the metric and the threshold).
2. **Review the spec.** A spec is "ready" when a second person (or, here, an explicit
   review pass) signs off on the acceptance criteria. No implementation starts before this.
3. **Write tests first** against the acceptance criteria. They fail (red).
4. **Implement** until tests pass (green). Keep the diff scoped to the spec.
5. **Verify against the gate.** Unit/integration/e2e pass *and* the ML evaluation gate shows
   no regression. CI enforces both.
6. **Merge + record.** The ledger and `CHANGELOG` capture what changed and the metric delta.

Specs are numbered, immutable once shipped (amendments get a new spec that supersedes), and
small enough to implement in days, not weeks.

### Spec set

- `0000-template.md` — the spec template.
- `0001`–`0004` — platform, tenancy, ASN engine, core API (**Implemented**).
- `0005`–`0006` — Conductor loop, CLI/tracing (**Partial** — v0.3 hill-climb live).
- `0007`–`0009` — fleet registry, eval gates, training worker (**Implemented**).
- `0010-finance-applied-test.md` — Phase B finance vertical (**Draft**).
- `0012-synthetic-org-divisions-and-handoffs.md` — five divisions, closed loop (**Ready** registry; runtime handoffs **Partial**).

Full status matrix: [`specs/README.md`](./specs/README.md). Source traceability:
[`docs/SOURCE_MAP.md`](./docs/SOURCE_MAP.md). Production backend: **Railway** (ADR-002).

---

## 6. Roadmap (phased, spec-gated)

Estimates assume one focused builder + Cursor. Each phase ends with a demoable slice.

**Phase 0 — Foundation.** ✅ Monorepo, CI, Docker Postgres `:5433` + pgvector + RLS, core-api
v0.3, worker, specs 0001–0004.

**Phase 1 — Engine + serving.** ✅ ASN math + tests, eval-harness, `/embed` + `/search`
(pgvector), Phase A orgs trained/deployed/indexed. Specs 0003, 0008, 0009.

**Phase 2 — The Conductor.** 🟡 Hill-climb + worker + Eve tools live (Spec 0005 v0.3); LLM recipe
generation, Modal GPU, eval-set rotation, **0012 runtime handoffs** (BD queue write, charter gate)
— **partial**.

**Phase 3 — Fleet sites + isolation.** ✅ `apps/sites/*`, control plane, fleet registry,
division registry (Spec 0012); RLS negative tests; four Phase A tenants concurrent. Spec 0007.

**Phase 4 — Finance vertical (Phase B).** ⬜ Spec 0010 draft; `finance-lab` stub; simulation
eval harness — no live trading (guardrail locked).

**Phase 5 — Hardening for real traffic.** ⬜ IVFFlat/HNSW, JWT dashboard auth, Neon cutover,
load tests, secrets manager, runbooks.

---

## 7. Production-grade checklist (tracked from day one)

- **Security:** scoped API keys (hashed at rest), JWT for the dashboard, Postgres RLS per
  tenant, input validation via Pydantic/Zod, per-tenant rate limits, secrets in a manager
  (not `.env` in prod), dependency scanning in CI.
- **Testing:** unit (engine math, schemas), integration (api+db+redis), e2e (web→api),
  load (serving), and **ML evaluation gates** that block regressions. Coverage thresholds in
  CI.
- **CI/CD:** GitHub Actions — lint, typecheck, test, build, Turbo remote cache; Vercel
  preview deploys per PR; migrations run in a gated step.
- **Observability:** structured JSON logs, OpenTelemetry traces across web→api→workers,
  Sentry for errors, Prometheus/Grafana (or host-native) for serving latency, queue depth,
  GPU utilization, and per-tenant cost burn.
- **Reproducibility & governance:** seeded training runs, a model registry with lineage, an
  immutable experiment ledger, dataset versioning, and an audit trail per workspace.
- **Cost controls:** per-tenant daily ceiling enforced in the Conductor; PEFT default;
  trainers scale to zero; eval-set rotation to prevent overfit-driven wasted runs.

---

## 8. Local development

See [`README.md`](./README.md) and [`HANDOFF.md`](./HANDOFF.md) §6 for the full stack. Short
path:

```bash
pnpm install && uv sync --all-packages --extra dev --extra model
cp .env.example .env
pnpm dev:stack && pnpm db:migrate
pnpm dev:api          # :8000
pnpm dev:worker
pnpm bootstrap:orgs && pnpm kickoff:orgs
pnpm dev:fleet        # hub :3000, control :3002, …
pnpm review
uv run pytest packages/asn-engine services/core-api/tests -q
```

---

## 9. Open items I need from you (non-blocking for scaffolding)

1. **Your existing Vercel sites & domains — LOCKED** (see `HANDOFF.md` §1):
   **bhenre.com** (hub) · **slasso.com** (benchmark lab) · **arxiviq.com** (research RAG) ·
   **jcamd.com** (operator control plane) · **dumbmodel.com** (baseline comparison). One monorepo,
   multiple Vercel projects, per-tenant API keys.
2. **Product name — LOCKED:** **Blue Hen RE** (*RE* = RAG Embeddings). Codename `bluehenre`;
   SynthaEmbed OS is the internal platform name. GitHub: `henington-homes`; Vercel: `bhre`.
3. **Phase B finance** — spec 0010 drafted from [Doc 3](https://docs.google.com/document/d/14Rtz1r_3AQIM8cChKVsjPqt8kHH6PqV6RWPIEkH10Ik/edit);
   confirm simulation metrics before implementation.
4. **Docs 4 & 5** — export [Doc 4](https://docs.google.com/document/d/1BjyQqI7gq5c52d576LNiejjqMrYNvfq8bG3ptOps7Zw/edit) and
   [Doc 5](https://docs.google.com/document/d/12kAuscAIsTL6CEnAgo1OZT22hKXzz9fcOerkafHEAOI/edit) to
   `docs/exports/` so `docs/SOURCE_MAP.md` can name them.
5. **Orchestrator + GPU** — LLM for Conductor recipes; Modal tier for `services/trainer`.

---

## 11. Architecture update — synthetic org + unified access (built)

The platform layer has been re-scaffolded around the Master Spec and your two refinements
(whitepaper-at-the-center; one uniform, traceable interface). What now exists on disk:

**The synthetic organization (`apps/synthorg/`, Vercel Eve).** A mini-org is one Eve app: a
**Chief of Staff** director (`agent/`) governing four worker subagents mapped to your model
lifecycle —

- `data_harvester` → **collect** (ingest → LMAR chunk → synth pairs)
- `training_orchestrator` → **train/validate** (compose ASN recipe → launch on Modal → poll)
- `qa_benchmark` → **applied test** (rotating-slice eval → gates → promote/reject)
- `field_operator` → **real-world use** (deploy w/ Matryoshka+quant → serve → drift watch)

Governance (budget checks, autonomous termination, human approval for production) lives in the
Chief of Staff instructions + root tools. Drift at stage 4 reopens stage 1.

**The unified access layer + tracing (`packages/synth-core`, `packages/cli`).** Every actor —
each agent tool, the `synth` CLI, CI, and the dashboard — reaches *all* services and dbs
through one `Synth` client and one chokepoint (`services/core-api`). Every call is a span with
an actor + target, propagated across TS↔Python via `x-synth-*` headers, so an entire objective
(including cross-agent handoffs and Modal jobs) replays with `synth trace view <id>`. No agent
calls a service directly — uniformity and traceability by construction (spec 0006).

**Compute (`services/worker/` today; `services/trainer/` Modal next).** Worker runs the full
lifecycle locally; Modal will offload GPU training with trace propagation (spec 0005).

**Fleet registry (`config/fleet.json` + `packages/fleet`).** Single source of truth for all
sites, domains, app paths, and dev ports. Agent tools `fleet_list` / `fleet_context` and CLI
`synth fleet list|context` generate pair-programming maps.

**Control plane (`apps/control/` → jcamd.com).** Operator fleet map; entry point for cross-org work.

**Fleet agent (`apps/synthorg/`).** Eve Chief of Staff operates all mini-orgs in unison via
`synth-core`; load skill `fleet-orchestration.md` for multi-site tasks.

**Tenant sites (`apps/sites/*`).** One deploy per domain — `hub` (bhenre.com), `dumbmodel`,
`benchmark-lab` (slasso.com), `research-rag` (arxiviq.com), etc.

Updated layout: `config/fleet.json`, `apps/{control, synthorg, sites/*}`,
`services/{core-api, worker, trainer}`, `packages/{fleet, asn-engine, eval-harness, synth-core, cli}`,
`AGENTS.md`, `docs/SOURCE_MAP.md`, `specs/0001–0010`, `WHITEPAPER.md` at the center.

## 10. Honest risk register (carried from the sources)

- **Scientific overreach.** The ASN whitepaper overstates and mis-cites. We keep the real,
  measurable mechanisms and drop the rest. See `SCIENCE_REVIEW.md`. *Mitigation:* evaluation
  gates make every claim falsifiable in CI.
- **Auto-research cost blowup.** *Mitigation:* PEFT default, cost ceiling, scale-to-zero
  trainers.
- **Eval overfitting.** *Mitigation:* rotating, freshly-synthesized eval slices (Spec 0005).
- **Tenant data bleed.** *Mitigation:* RLS + namespace isolation + mandatory negative tests
  in Phase 3's gate.
- **Finance vertical implies trading.** If the MTNN's portfolio head is ever used with real
  capital, that is a regulated activity and out of scope for this platform to *execute* — we
  build the model and analytics, not order placement.
