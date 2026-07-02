# SynthaEmbed OS — Architecture & Spec-Driven Development Plan

> **Archived export — superseded.** Canonical plan: [`../../PLAN.md`](../../PLAN.md).
> Historical paths (`apps/org-template`, etc.) do not reflect the fleet layout in
> `apps/sites/*` + `config/fleet.json`. Do not merge back — see [`../SOURCE_MAP.md`](../SOURCE_MAP.md).

Codename **bluehenre**. This document is the single source of truth for *what* we are building and *how* we build it. It is written to be read top-to-bottom once, then used as a reference. Every line of code in this repo should trace back to a spec in [`specs/`](http://./specs), and every spec should trace back to a goal in this plan.

---

## 1\. The synthesis: three conversations → one platform

You brought three threads. They are not three projects; they are three layers of one product.

| Source | What it really is | Role in the platform |
| :---- | :---- | :---- |
| **AwakenedSleepNet (ASN)** whitepaper | A training *method* for collapse-resistant embeddings (effective-rank monitoring, spectral surgery, Newton-Schulz orthogonalization, info-bottleneck projection head) | **The engine.** Every mini-org trains with ASN. |
| **SynthaEmbed OS** | A *platform* wrapper: an autonomous "synthetic organization" with an LLM-orchestrated auto-research hill-climbing loop, multi-tenant workspaces, Vercel \+ FastAPI \+ PyTorch | **The operating system.** Tenancy, the auto-research Conductor, serving, dashboards. |
| **Embedding Co. MTNN** | An *applied vertical*: a multi-task multimodal network (MoE trunk, aux heads, differentiable-Sharpe portfolio head) | **The reference mini-org.** Proves the template end-to-end on a hard domain (finance). |

**The unifying idea (your "mini-organizations"):** a mini-org is an autonomous tenant that owns its own *site*, *API surface*, and *interactions* (data ingestion → training → evaluation → serving), all running the shared ASN engine and Conductor loop, specialized to one domain. The "four orgs collapsed into one MTNN" from Source 3 is exactly how a single mini-org works internally: ingestion → shared trunk → eval heads → live head, with the "gap report between teams" replaced by gradients flowing backward. The platform runs *many* such mini-orgs side by side with hard isolation between them.

This is also the clean way to **repurpose your existing Vercel sites**: each becomes one mini-org front-end (`apps/org-template` is the shape they conform to), pointed at a scoped slice of the core API.

---

## 2\. Product principles

1. **Production-grade from commit \#1.** Auth, tenant isolation, tests, CI, observability, and reproducibility are scaffolded before features, not bolted on.  
2. **Spec before code.** No feature merges without a spec and acceptance criteria. ML changes don't merge without an *evaluation gate* (a metric that must not regress).  
3. **The engine is shared; the data is sovereign.** One ASN codebase, N isolated tenants. Zero-trust between mini-orgs: separate keys, Postgres row-level security, separate vector namespaces, per-tenant cost ceilings.  
4. **Honest science.** We ship mechanisms we can verify and measure. Marketing claims like "100% scientifically accurate" do not appear in code, docs, or product copy (see `SCIENCE_REVIEW.md`).  
5. **Cost is a first-class constraint.** The auto-research loop defaults to PEFT and rotates its eval sets — both are correctness requirements, not optimizations (Source 2's own critique flagged runaway compute and eval overfitting; we design those out).

---

## 3\. Architecture

### 3.1 System shape

                         ┌──────────────────────────────────────────┐

   Vercel (edge)         │            Control plane (apps/web)        │

   ┌───────────────┐     │  tenant dashboards · experiment ledger ·   │

   │ mini-org site │────▶│  spectral-health charts · API key mgmt     │

   │ (org-template)│     └───────────────────┬────────────────────────┘

   └───────────────┘                         │  HTTPS (sdk-ts)

                                             ▼

                              ┌───────────────────────────────┐

                              │      core-api (FastAPI)        │

                              │  authn/z · tenants · ledger ·  │

                              │  serving gateway · job submit  │

                              └───┬───────────────┬───────────┘

                          jobs    │               │  reads/writes (RLS)

                                  ▼               ▼

                    ┌──────────────────┐   ┌───────────────────┐

                    │  conductor       │   │ Postgres+pgvector │

                    │ (auto-research)  │   │  Redis (queue)    │

                    └────────┬─────────┘   └───────────────────┘

                             │ launches

                             ▼

                    ┌──────────────────┐

                    │ trainer (PyTorch)│  ── ASN engine \+ eval-harness

                    │   GPU workers    │      → model registry

                    └──────────────────┘

### 3.2 Components and responsibilities

- **`apps/web`** — Next.js 15 App Router control plane. Server components \+ TanStack Query for live data; Recharts for loss/effective-rank trajectories. Deploys to Vercel.  
- **`apps/org-template`** — the canonical mini-org front-end. Existing Vercel sites are migrated onto this shape (or kept as-is and pointed at a scoped API key).  
- **`services/core-api`** — FastAPI \+ Pydantic v2 \+ SQLAlchemy 2.0 \+ Alembic. Owns the request path: authentication, authorization, tenant resolution, the experiment ledger, the serving gateway (embedding inference), and job submission. Stateless; horizontally scalable behind a load balancer.  
- **`services/conductor`** — the auto-research loop. Reads the ledger, identifies the weakest eval slice, asks the orchestrator LLM for a new training recipe (hyperparameters, tokenizer config, loss weights), validates it against guardrails, and enqueues a trainer job. Respects per-tenant cost ceilings.  
- **`services/trainer`** — GPU worker. Runs ASN training from a recipe, evaluates with `eval-harness`, writes weights to the model registry, and posts the metric delta back to the ledger. Idempotent and seeded for reproducibility.  
- **`packages/asn-engine`** — pure ML: the model, spectral surgery, Newton-Schulz orthogonalization, projection head, contrastive losses, Procrustes alignment. No web/db concerns. Heavily unit-tested (the math is verified — see `specs/0003`).  
- **`packages/eval-harness`** — intrinsic diagnostics (effective rank, Wang–Isola uniformity, alignment) and an MTEB-style extrinsic runner. Produces the metrics the evaluation gates depend on.  
- **`packages/sdk-ts`** — typed client generated from the API's OpenAPI schema.  
- **`packages/ui` / `packages/config`** — shared React components and tooling config.

### 3.3 Recommended stack (the "best setup" you asked me to choose)

- **Frontend/edge:** Next.js 15 (App Router), TypeScript (strict), Tailwind, shadcn/ui, TanStack Query, Recharts. Hosted on **Vercel**.  
- **API:** Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic. **PostgreSQL 16 \+ pgvector** (one database, vectors and metadata together to start; Qdrant is a drop-in later via `VECTOR_BACKEND`). **Redis** for the job queue (Arq — async-native, simpler than Celery for our shape) and caching.  
- **ML:** PyTorch, Hugging Face `transformers`/`tokenizers`, `sentence-transformers` as the baseline to beat. Experiment tracking via Weights & Biases (optional, env-gated).  
- **Compute:** Vercel for `web`; a container host (Fly.io / Render / Railway) for `core-api` and `conductor`; an on-demand GPU provider (Modal / RunPod) for `trainer`. Training is bursty, so trainers scale to zero between jobs.  
- **Monorepo:** **Turborepo \+ pnpm** for JS; **uv workspaces** for Python. Polyglot but each toolchain stays idiomatic. One repo, one CI, atomic cross-cutting changes.

**Why this and not the alternatives:** separate repos per site would fragment the shared engine and make the "one engine, many orgs" guarantee impossible to enforce; an all-TS stack can't host PyTorch training; an all-Python stack gives up Vercel's edge story for the sites you already have. A polyglot monorepo is the only option that satisfies all three sources at once.

---

## 4\. The mini-organization model (the core abstraction)

A mini-org is defined entirely by data, not by forked code:

- **Identity & isolation:** a `workspace` row, a hashed API key, a Postgres RLS policy keyed on `workspace_id`, and a vector namespace. No mini-org can read another's rows or vectors.  
- **Site:** a deployment of `org-template` (or a migrated existing Vercel site) bound to one API key.  
- **API surface:** the same core-api routes, scoped by the key — `/embed`, `/search`, `/research/*`, `/ledger`, `/models`.  
- **Interactions (the loop):** ingestion → ASN training → evaluation → serving, with the Conductor driving continuous improvement. Internally this is the MTNN from Source 3: multimodal ingestion → shared MoE trunk → auxiliary eval heads → primary task head.  
- **Sovereignty controls:** per-tenant cost ceiling, eval-set rotation policy, model registry prefix, and rate limits.

Onboarding a new mini-org is an API call \+ a Vercel deploy, never a code change. That is the test of whether the abstraction is right.

---

## 5\. Spec-driven development workflow

We use a lightweight, enforceable loop. It lives in [`specs/`](http://./specs).

1. **Write the spec** (`specs/NNNN-name.md`) from the template. It must contain: problem, goals, non-goals, API/data contract, acceptance criteria, **test plan**, and — for ML work — an **evaluation gate** (the metric and the threshold).  
2. **Review the spec.** A spec is "ready" when a second person (or, here, an explicit review pass) signs off on the acceptance criteria. No implementation starts before this.  
3. **Write tests first** against the acceptance criteria. They fail (red).  
4. **Implement** until tests pass (green). Keep the diff scoped to the spec.  
5. **Verify against the gate.** Unit/integration/e2e pass *and* the ML evaluation gate shows no regression. CI enforces both.  
6. **Merge \+ record.** The ledger and `CHANGELOG` capture what changed and the metric delta.

Specs are numbered, immutable once shipped (amendments get a new spec that supersedes), and small enough to implement in days, not weeks.

### Initial spec set (already drafted in this scaffold)

- `0000-template.md` — the spec template.  
- `0001-platform-overview.md` — glossary, boundaries, non-goals.  
- `0002-mini-organization-model.md` — tenancy, isolation, onboarding, RLS.  
- `0003-asn-embedding-engine.md` — the verified math \+ module contracts.  
- `0004-core-api.md` — routes, auth, schemas, error model.  
- `0005-auto-research-conductor.md` — the loop, guardrails, cost ceilings, eval rotation.

---

## 6\. Roadmap (phased, spec-gated)

Estimates assume one focused builder \+ Cursor. Each phase ends with a demoable slice.

**Phase 0 — Foundation (this scaffold \+ wiring).** Monorepo, CI, env, docker-compose, Postgres+pgvector+Redis up, `core-api` health \+ auth \+ tenants with RLS, `web` shell that logs in and lists workspaces. Specs 0001, 0002, 0004\.

**Phase 1 — Engine \+ serving (the smallest honest product).** `asn-engine` implemented and unit-tested (effective rank, Newton-Schulz, InfoNCE, projection head). `trainer` can fine-tune a `sentence-transformers` baseline with ASN regularization on a small corpus. `eval-harness` reports effective rank \+ uniformity \+ one retrieval metric. `/embed` and `/search` serve a trained model. Spec 0003\. **Gate:** ASN run holds effective rank above the SimCLR-style baseline at equal retrieval nDCG.

**Phase 2 — The Conductor (what makes it "autonomous").** Auto-research loop: ledger-driven recipe generation, guardrails, cost ceiling, eval-set rotation, Arq job queue. Dashboard shows the live experiment ledger and spectral-health trajectories. Spec 0005\. **Gate:** N autonomous iterations improve the rotating eval metric without effective-rank collapse, under the cost ceiling.

**Phase 3 — Mini-org template \+ repurpose Vercel sites.** `org-template` finalized; migrate (or bind) your existing Vercel sites as mini-orgs; the finance MTNN from Source 3 lands as the reference vertical. **Gate:** two isolated mini-orgs run concurrently with verified cross-tenant isolation (negative tests prove no data bleed).

**Phase 4 — Hardening for real traffic.** Load tests, rate limiting, p95 serving latency target, secrets management, backups, runbooks, on-call alerts, model-registry promotion/rollback. **Gate:** deploy checklist green (see §8) and a documented rollback drill.

---

## 7\. Production-grade checklist (tracked from day one)

- **Security:** scoped API keys (hashed at rest), JWT for the dashboard, Postgres RLS per tenant, input validation via Pydantic/Zod, per-tenant rate limits, secrets in a manager (not `.env` in prod), dependency scanning in CI.  
- **Testing:** unit (engine math, schemas), integration (api+db+redis), e2e (web→api), load (serving), and **ML evaluation gates** that block regressions. Coverage thresholds in CI.  
- **CI/CD:** GitHub Actions — lint, typecheck, test, build, Turbo remote cache; Vercel preview deploys per PR; migrations run in a gated step.  
- **Observability:** structured JSON logs, OpenTelemetry traces across web→api→workers, Sentry for errors, Prometheus/Grafana (or host-native) for serving latency, queue depth, GPU utilization, and per-tenant cost burn.  
- **Reproducibility & governance:** seeded training runs, a model registry with lineage, an immutable experiment ledger, dataset versioning, and an audit trail per workspace.  
- **Cost controls:** per-tenant daily ceiling enforced in the Conductor; PEFT default; trainers scale to zero; eval-set rotation to prevent overfit-driven wasted runs.

---

## 8\. Local development

pnpm install

uv sync

cp .env.example .env            \# fill in secrets

docker compose \-f infra/docker-compose.yml up \-d   \# postgres+pgvector, redis

uv run alembic \-c services/core-api/alembic.ini upgrade head

uv run uvicorn app.main:app \--reload \--app-dir services/core-api

pnpm \--filter web dev

uv run pytest packages/asn-engine                  \# math tests (should pass today)

---

## 9\. Open items I need from you (non-blocking for scaffolding)

1. **Your existing Vercel sites** — names/repos, or connect a Vercel/GitHub connector, so I can repurpose them into `org-template` mini-orgs rather than greenfield ones.  
2. **Product name** — "SynthaEmbed OS" is inherited from Source 2; the folder is `bluehenre`. Say the word and I'll standardize one across the repo.  
3. **First real domain** — finance (the MTNN) is the obvious reference mini-org; confirm or swap (e.g. people-analytics, which Source 2 mentioned).  
4. **Orchestrator \+ GPU providers** — which LLM API for the Conductor, and which GPU host for the trainer, so I wire concrete adapters.

---

## 10\. Honest risk register (carried from the sources)

- **Scientific overreach.** The ASN whitepaper overstates and mis-cites. We keep the real, measurable mechanisms and drop the rest. See `SCIENCE_REVIEW.md`. *Mitigation:* evaluation gates make every claim falsifiable in CI.  
- **Auto-research cost blowup.** *Mitigation:* PEFT default, cost ceiling, scale-to-zero trainers.  
- **Eval overfitting.** *Mitigation:* rotating, freshly-synthesized eval slices (Spec 0005).  
- **Tenant data bleed.** *Mitigation:* RLS \+ namespace isolation \+ mandatory negative tests in Phase 3's gate.  
- **Finance vertical implies trading.** If the MTNN's portfolio head is ever used with real capital, that is a regulated activity and out of scope for this platform to *execute* — we build the model and analytics, not order placement.

