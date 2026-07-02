# HANDOFF — Blue Hen RE (codename `bluehenre`)

Paste-ready context for starting the **code** session. Read top to bottom once; it's written
so a fresh coding agent (Cursor) can pick up without re-deriving anything.

**Brand:** **Blue Hen RE** — *RE* = **RAG Embeddings** (not real estate). Mascot: blue hen.
Platform architecture internally called **SynthaEmbed OS**.

---

## 0. One-paragraph mission

Build a multi-tenant platform of autonomous **synthetic organizations**. Each org (a tenant /
"mini-org") runs a four-stage model lifecycle — **collect → train/validate → applied-test →
real-world use** — to produce a domain-specialized, **collapse-resistant embedding model**
using the **AwakenedSleepNet (ASN)** method, then serves it cheaply at the edge (Matryoshka
truncation + int8/binary quantization). The bet: better-than-commercial RAG embeddings,
practically free to run (open models + scale-to-zero GPU), large return at scale. The
**whitepaper is the center**; everything is built around it.

## 1. Where everything is

Repo root: `C:\Users\jcdav\bluehenre` (this is the connected folder; build here).

```
config/work_queue.json   ← SINGLE TASK QUEUE — pick_task.py list/claim/done
config/fleet.json        ← fleet registry: all sites, domains, app paths (SOURCE OF TRUTH)
AGENTS.md                ← pair-programming guide for Cursor + Eve agent
WHITEPAPER.md            ← the scientific center (ASN, v3.1, evidence-driven §8.1)
EVIDENCE.md              ← measured results ledger — normative for product claims
SCIENCE_REVIEW.md        ← integrity audit — NORMATIVE
docs/SOURCE_MAP.md       ← Google Docs + docs/sources/ traceability
docs/sources/            ← archived exports from authoring docs
PLAN.md                  ← architecture + spec-driven plan
specs/0001..0010         ← spec-driven dev; code must trace to a spec
apps/
  control/               ← jcamd.com operator control plane (fleet map)
  synthorg/              ← Eve fleet agent — operates all sites in unison
  sites/
    hub/                 ← bhenre.com platform dashboard
    dumbmodel/           ← dumbmodel.com public proof
    benchmark-lab/       ← slasso.com RAG benchmark lab
    research-rag/        ← arxiviq.com research RAG org
    finance-lab/         ← Simulation Lab (simulation only)
services/
  core-api/              ← FastAPI uniform chokepoint
  worker/                ← Postgres job consumer (train → eval → deploy)
  trainer/               ← Modal GPU stub (scale-out TBD)
infra/
  railway.md             ← production deploy runbook (ADR-002)
  docker-entrypoint.sh   ← api | worker | migrate (shared Dockerfile)
Dockerfile               ← Railway build (core-api + worker)
railway.toml             ← Railway health check + resource limits
packages/
  fleet/                 ← @synthaembed/fleet SDK
  ui-fleet/              ← FleetShell cross-site nav
  asn-engine/            ← ASN math (verified)
  eval-harness/          ← nDCG, effective rank, deploy gates
  eval-public/           ← dumbmodel baseline panel + corpus
  synth-core/            ← uniform access + tracing
  cli/                   ← synth CLI (+ fleet list/context)
```

### Mini-org fleet (deployed sites → tenants)

All sites share **`core-api`** + **`synth-core`**; each Vercel project gets its own
`workspace_id` + API key (spec 0002). Source repos under
[jcdavis131](https://github.com/jcdavis131?tab=repositories).

### Domain fleet — LOCKED

Owned domains to attach in Vercel (one custom domain per mini-org / project):

| Domain | Mini-org | GitHub / app | Phase |
|---|---|---|---|
| **[jcamd.com](https://jcamd.com)** | **Fleet control plane** | `apps/hq` | All | Operator map, pair-programming entry |
| **[bhenre.com](https://bhenre.com)** | **Blue Hen RE hub** | `apps/sites/storefront` | All | Platform dashboard + ledger |
| **[slasso.com](https://slasso.com)** | **RAG Benchmark Lab** | `apps/sites/validation` | A |
| **[arxiviq.com](https://arxiviq.com)** | **Research RAG org** | `apps/sites/research` | A |
| **[dumbmodel.com](https://dumbmodel.com)** | **Dumb Model** public proof | `apps/sites/dumbmodel` | A → socialize |

*(Phase B finance lab: domain TBD when `apps/sites/simulation` is scoped.)*

#### dumbmodel.com — brand direction (LOCKED)

**Role in the fleet:** the loud, honest front door. **bhenre.com** is the platform you trust;
**dumbmodel.com** is where you *laugh*, then look at the numbers. Perfect anti-hype pairing with
`SCIENCE_REVIEW.md` — no mystique, just measurable collapse vs ASN.

**Two-mascot system**

| | **Blue Hen** (bhenre.com) | **Dumb Model** (dumbmodel.com) |
|---|---|---|
| Vibe | Awake, spectral surgery, org-trained | Collapsed cone, low effective rank, happily wrong |
| Promise | RAG Embeddings that don’t fold | Shows what folding looks like |
| Audience | Builders, tenants, operators | Public, dev Twitter, eval skeptics |

**Voice:** irreverent, scientifically literate, never cruel to users — we roast *collapsed
representations* and commercial baselines, not people. Every punchline links to a reproducible
eval gate (nDCG, effective rank, rotating slice).

**Hero hooks (product = marketing)**

- **“How dumb is your embedding?”** — live compare: pick a baseline (BGE, e5, OpenAI-class) vs
  a Blue Hen RE org model on the same query/corpus; show retrieval diff + rank spectrum.
- **Dumbness Score** — effective rank + collapse diagnostics as a single shareable number/card.
- **Hall of Cone** — leaderboard of baselines on the fixed panel (lowest rank wins the cone).
- **RAG tier carnival** — basic → advanced pipelines; dumb model fails visibly on multi-hop while
  hen-trained org holds (slasso.com links for deep benchmarks).
- **Share cards** — OG images: “My model’s effective rank: 1.2 🐔 vs yours: 847 pretending to be 768.”

**Funnel:** dumbmodel.com (viral proof) → slasso.com (rigorous benchmarks) → bhenre.com (run your
own org) → arxiviq.com (applied science RAG demo).

**Build:** `apps/sites/dumbmodel` — Next.js, read-only public eval-harness + embed/search via
`synth-core` (no keys required for baseline panel; tenant compare when user supplies workspace key).

**DNS / Vercel:** point each domain at its Vercel project; keep `*.vercel.app` as preview aliases.
Canonical production URLs should use custom domains above, not legacy names (e.g. prefer
`bhenre.com` over `bhre.vercel.app` once cutover is done).

| GitHub repo | Custom domain | Vercel preview | Mini-org role | Phase | Repurpose path |
|---|---|---|---|---|---|
| [`henington-homes`](https://github.com/jcdavis131/henington-homes) | **bhenre.com** | `bhre.vercel.app` | **Platform hub** — monorepo; `apps/sites/storefront` + `apps/synthorg` | All | **Done** (this repo) |
| [`agent-lasso`](https://github.com/jcdavis131/agent-lasso) | **slasso.com** | TBD | **RAG Benchmark Lab** — benchmark exams, leaderboards, GraphRAG | **A** | `apps/sites/validation`; migrate `benchmark_exam_engine` |
| [`arxiv_exam_app`](https://github.com/jcdavis131/arxiv_exam_app) | **arxiviq.com** | TBD | **Research RAG org** — arXiv PDF RAG applied test | **A** | `apps/sites/research` |
| *(monorepo)* | **jcamd.com** | TBD | **Operator control plane** | All | `apps/hq` |
| *(monorepo)* | **dumbmodel.com** | TBD | **Dumb Model** — public anti-hype proof, Hall of Cone | A → socialize | `apps/sites/dumbmodel` **built** |
| *(future)* | TBD | TBD | **Finance applied-test org** | **B** | `apps/sites/simulation` (stub) |
| *(future v2)* | TBD | TBD | **Live trading org** | **C** | Deferred |

**Multi-site pattern:** one GitHub monorepo (`henington-homes`), **multiple Vercel projects**
(one per row), each with `SYNTH_API_KEY` + `NEXT_PUBLIC_API_BASE_URL` scoped to its workspace.
Legacy Python UIs (Lasso, arXiv) become thin clients — no direct DB/Modal; all lifecycle calls
through `synth-core` → `core-api`.

## 2. Architecture in five sentences

1. **One engine, many tenants:** all mini-orgs share `asn-engine`; isolation is data-only
   (Postgres RLS on `workspace_id`, per-tenant vector namespace + cost ceiling) — spec 0002.
2. **Synthetic org = Vercel Eve app:** a Chief of Staff director delegates the lifecycle to
   `data_harvester` / `training_orchestrator` / `qa_benchmark` / `field_operator` subagents.
3. **Unified access + tracing (spec 0006):** every agent tool, the `synth` CLI, CI, and the
   dashboard reach ALL services/dbs through `synth-core` → `core-api`; every call is a span
   with actor+target, propagated TS↔Python via `x-synth-*` headers, replayable with
   `synth trace view <id>`. No component calls a service directly.
4. **Compute split:** Phase A training runs on the **Railway worker** (CPU, always-on job loop);
   GPU scale-out moves to **Modal** when Spec 0011 lands. Sites and API never run PyTorch on Vercel.
5. **Edge serving:** Matryoshka + int8/binary quantization make the trained embeddings cheap.

## 3. Model strategy (free / open / local-first) — answers the "Kimi?" question

- **Agents:** model-agnostic, **local-first**. Set `SYNTH_LOCAL_LLM_BASE_URL` to your Ollama
  endpoint (`http://localhost:11434/v1`); default model **Qwen3** (strong tool-use, single-GPU
  friendly). `agent/agent.ts` already supports this; workers can run a smaller model
  (`SYNTH_WORKER_MODEL`).
- **Kimi K2.5/K2.6:** open-weights (Modified MIT) but **~1T params / 32B active** — not
  workstation-local. Use via a served endpoint (vLLM/SGLang or Ollama *cloud*) and point
  `SYNTH_LOCAL_LLM_BASE_URL` at it. Treat as the "max-quality" tier, not the default.
- **The embedding product (the actual point):** fine-tune small **open** bases
  (Qwen3-Embedding-0.6B, BGE, e5/GTE) with ASN; truncate (Matryoshka) + quantize for the
  edge. This is where "better + practically free" is real and defensible.
- **Cost posture:** local agents = $0 marginal; GPU training is bursty + scale-to-zero
  (Modal); serving is quantized small models. Per-tenant daily cost ceiling enforced.

## 3b. Mini-org evolution (locked — v1 → socialize)

Three tenants in sequence; each consumes the output of the previous. **v2 live trading is the
last build before socializing results** — not in scope for current implementation.

| Phase | Mini-org | Role | In scope now? |
|---|---|---|---|
| **A** | **RAG Benchmark Lab** | Train org embeddings (ASN); compare vs SOTA on **basic → advanced RAG** (retrieval metrics + leaderboard). | **Yes — pilot** |
| **B** | **Finance applied-test org** | Take passing models/RAG stacks and stress-test them in **realistic finance scenarios**: RAG over filings/research/market narrative, then evaluate **fictional / paper trading strategies** (simulation & backtest only). Proves embeddings help where it matters beyond nDCG. | **Yes — after A gates** |
| **C** | **Live trading org (v2)** | Downstream team tries to **mimic Phase B success with a real trading account**. Last evolution of the project; results feed public socialization. | **No — v2 / post-proof** |

**Flow:** A produces ranked embedding models → B deploys them in finance RAG apps and measures
simulated strategy outcomes → C (later) attempts live replication under strict Operator +
compliance gates.

**Hard guardrail (v1):** Phases A and B are **analytics and simulation only** — no order
execution, no money movement, no live brokerage integration. Phase C is explicitly deferred.

## 4. Status: real vs. stubbed (updated 2026-06-30)

**Production path — real now:**
- **Postgres + pgvector + RLS** — Docker `:5433`, Alembic `001`–`004`, `synthaembed_tenant`
  role + `SET LOCAL ROLE` so RLS applies; negative isolation tests in
  `services/core-api/tests/test_rls.py`.
- **`core-api` v0.3** — workspaces, ingest/chunk/pairs, train jobs, eval, deploy, embed,
  search (pgvector ANN), ledger, trace, budget; RFC 9457 problem+json errors;
  `GET /v1/admin/fleet`.
- **Worker** — claims jobs from Postgres, runs ASN contrastive training locally, eval-harness
  gates, auto-deploy + chunk indexing.
- **Phase A fleet** — hub, benchmark-lab, research-rag, dumbmodel: each has workspace,
  corpus (`data/corpora/{siteId}/`), trained ASN model, deployed + 8 indexed chunks.
- **eval-harness** — pairwise nDCG@10, effective rank, deploy gates (`packages/eval-harness`).
- **6 Next.js sites + control** — `pnpm review` passes; `@synthaembed/ui-fleet` cross-nav.
- **ASN math** — effective rank, quintic/cubic Newton-Schulz (roles per `SCIENCE_REVIEW.md` §3),
  InfoNCE, Procrustes, three-tier surgery + unit tests (9/9 green); `train_loop.py` wired to worker.
- **synth-core** SDK + trace contract; `synth` CLI; Eve agent tree with hill-climb tool.

**⚠ Engine claim NOT proven (read before building on it) — 2026-06-27:**
- The ASN **math primitives** are verified, but the **central product claim is still a
  hypothesis**: "ASN raises effective rank under collapse without nDCG loss" is *unmeasured*.
- A real apples-to-apples ablation (`scripts/engine_proof.py`, ASN vs InfoNCE, same data/seed)
  initially **failed** because the collapse trigger measured rank on a single batch (capped by
  batch size) and fired surgery unconditionally — *hurting* ASN. **Fixed** (rolling-window
  trigger); ASN now at no-harm parity, surgeries=0 on non-collapsing data. See `EVIDENCE.md` §3.1.
- The toy corpus **cannot** test the benefit claim (robust pretrained backbone never collapses).
  **Do not** ship "collapse-resistant / better-than-commercial" copy until a collapse-regime
  experiment vs BGE-M3 / e5 / Qwen3-Embed moves the `EVIDENCE.md` row to **Measured**.

**Production hosting (ADR-002 — accepted, deploy pending):**
- **Railway** — two services from root `Dockerfile`: `core-api` (public HTTPS, `/healthz`) and
  `worker` (start command `worker`, ≥4 GB RAM). Runbook: `infra/railway.md`.
- **Neon Postgres** — prod `DATABASE_URL`; Alembic via `pnpm deploy:railway:migrate` or
  `migrate` entrypoint on release.
- **Vercel fleet env** — after Railway URL live: `pnpm bootstrap:orgs` →
  `pnpm vercel:env-fleet:exec` (per-site `SYNTH_API_KEY` + `SYNTH_API_BASE_URL`).
- **Task:** `INF-003` (blocked on Operator `BLK-PROD` until Neon + Railway + Vercel link done).
- **Unified deploy:** `pnpm prod:deploy` / `prod:deploy:exec` — orchestrates migrate, Railway,
  bootstrap, Vercel env (see `scripts/prod-deploy.mjs`).
- **ADR-003:** org-scoped `synth --org <siteId>` — same entry point for Cursor, Claude, Eve,
  OpenCode (`docs/adr/003-unified-org-cli.md`).

**Stubbed / next:**
- **Modal trainer** (`services/trainer`) — not wired; GPU training runs via local/Railway worker.
- **IVFFlat/HNSW** — pgvector table live; no ANN index yet (fine at current scale).
- **JWT auth** — API key hash + admin bearer only today.
- **Railway artifact volume** — worker writes to `/data/artifacts`; attach volume or S3 before
  first prod train job (ADR-002 action #7).
- **Eve ↔ trace** — map eve session id → `SYNTH_TRACE_ID` (one session = one trace).
- **Direct-access lint gate** — spec 0006: forbid DB/service calls outside `synth-core`.
- **Phase B** — `apps/sites/simulation` stub (`@synthaembed/simulation` in `pnpm review`);
  strategy-simulation eval harness TBD.
- **Phase C** — live trading deferred (§3b guardrail).

**Phase A+ closed loop (implemented):**
- Worker → BD queue after eval gates; charter gate on deploy (`SYNTH_CHARTER_GATE=1`, default on).
- Bootstrap charters: `config/recipes/{siteId}.json` for Phase A tenants.
- Operator: Headquarters `/actions` — per-site hill-climb, charter issue, deploy promote.
- API: `POST /v1/admin/hill-climb`, `/v1/admin/bd/charter`, `/v1/admin/deploy`, `GET /v1/bd/queue`.

**Specs:** see `specs/README.md` — 0001–0012; **0012 Implemented** (registry + Phase A+ handoffs).
BD queue: `content/fleet/bd/queue.json` · charters: `config/recipes/`.

## 5. First coding tasks (suggested order, each spec-gated)

**Done (Phase A baseline):**
1. ~~Postgres + pgvector + RLS~~ — migrations + RLS tests.
2. ~~ASN training loop + worker~~ — `train_loop.py`, eval-harness, hill-climb lifecycle.
3. ~~Stages 3–4 for Phase A orgs~~ — deploy, pgvector index, `/v1/search`, fleet admin UI.
4. ~~Fleet sites build~~ — `pnpm review`.

**Next (in priority order):**
1. **Eve subagents** — add `agent/subagents/*/agent.ts` with `description` (Eve requirement).
2. **Modal trainer** — wire `services/trainer` behind `/v1/train` for GPU scale (spec 0004/0005).
3. **LLM conductor** — schema-validated recipe generation (spec 0005 partial).
4. **IVFFlat/HNSW index** — when chunk counts grow beyond demo corpora.
5. **Phase B finance-lab** — fictional strategy backtest harness (separate gate from nDCG).
6. **Eve trace wiring** + **direct-access lint gate** (spec 0006).
7. **Vercel/domain cutover** — attach locked domains per §1 table.

## 6. Run it locally

```bash
pnpm install
uv sync --all-packages --extra dev --extra model
cp .env.example .env            # DATABASE_URL :5433, API_SECRET_KEY, fleet keys

pnpm dev:stack                  # postgres :5433 + redis :6379
pnpm db:migrate                 # Alembic through 004_workspace_rls
pnpm dev:api                    # core-api :8000
pnpm dev:worker                 # ASN job worker

pnpm bootstrap:orgs             # workspaces → data/workspaces/*.env
pnpm kickoff:orgs               # hill-climb all Phase A orgs
pnpm backfill:deploy            # deploy + pgvector index existing models

pnpm dev:fleet                  # hub :3000, control :3002, dumbmodel :3001, …
.\scripts\fleet-review.ps1 -Open   # Windows: ports + open browser tabs
pnpm dev:site research-rag      # one site + auto-load data/workspaces/{id}.env
pnpm dev:site hub               # recommended: run stack first (below)

# Interactive fleet (live search + feedback → ledger)
# 1. docker compose up + db:migrate + bootstrap:orgs + kickoff:orgs
# 2. pnpm dev:api & pnpm dev:worker &
# 3. pnpm dev:site research-rag   → arxiviq :3004 — live /v1/search
# 4. pnpm dev:site dumbmodel      → compare + live org column
# 5. pnpm dev:site benchmark-lab  → /try exams + /queue BD pipeline
# 6. pnpm dev:site hub            → closed loop + /try + /feedback
# Thumbs up/down on search results logs stage=feedback to auto_research_ledger.
pnpm --filter @synthaembed/synthorg dev

pnpm review                     # build all sites + typecheck
uv run pytest packages/asn-engine services/core-api/tests -q
# ~38 tests (17 ASN + 21 core-api); DB tests skip fast when Postgres down
```
(Ollama: `ollama pull qwen3` then `ollama serve` for free local agents.)

**Windows:** if `pnpm` missing from PATH, use `npx pnpm@9.12.0`. See
[`docs/wiki/LOCAL_DEV.md`](./docs/wiki/LOCAL_DEV.md).

**OpenCode loop:** [`docs/OPENCODE_LOOP.md`](./docs/OPENCODE_LOOP.md) · shared boot
[`docs/wiki/SESSION_BOOT.md`](./docs/wiki/SESSION_BOOT.md).

### Production deploy (Operator — ADR-002)

```bash
pnpm prod:deploy                 # full checklist (dry-run)
pnpm prod:deploy:exec            # --step all --execute
# or stepwise:
pnpm deploy:railway              # checklist + data/deploy/railway.env template
# Set DATABASE_URL (Neon) in data/deploy/railway.env
pnpm deploy:railway:migrate      # Alembic against Neon
pnpm deploy:railway:exec         # Railway login + first core-api deploy
# Railway dashboard: add second service "worker" with start command: worker
pnpm bootstrap:orgs              # workspaces against prod SYNTH_API_BASE_URL
pnpm vercel:link-fleet:exec      # link monorepo roots to Vercel projects
pnpm vercel:env-fleet:exec       # push API URL + per-site keys
```

Full steps: [`infra/railway.md`](./infra/railway.md) · ADR: [`docs/adr/002-core-api-hosting.md`](./docs/adr/002-core-api-hosting.md).

## 7. Open decisions to confirm in the code session

1. **Pilot & tenant sequence — LOCKED** (see §3b):
   - **Phase A — RAG Benchmark Lab:** train org embeddings; compare vs SOTA on **basic →
     advanced RAG** (nDCG@10, Recall@k, MRR + leaderboard).
   - **Phase B — Finance applied-test org:** deploy passing models in finance RAG apps; measure
     success via **fictional / paper trading strategies** (simulation & backtest only).
   - **Phase C — Live trading (v2):** downstream real-account replication — **deferred** until
     A+B prove value; last step before socializing results.
   - **RAG tiers (Phase A):** basic bi-encoder → hybrid + rerank → multi-hop/HyDE-style.
   - **Baselines:** InfoNCE control + open SOTA panel (BGE-M3, e5/GTE, Qwen3-Embedding-0.6B).
   - **Deliverable:** `packages/eval-harness` + trainer stage 3 `/v1/eval/*`; Phase B adds
     strategy-simulation eval harness (separate gate from retrieval nDCG).
2. **GitHub / Vercel / domains — LOCKED:** Multi-site fleet (§1). **Domains owned:**
   `bhenre.com` · `slasso.com` · `arxiviq.com` · `jcamd.com` · `dumbmodel.com` — attach in Vercel
   per domain table. Re-point legacy Vercel projects to monorepo subpaths when `apps/*` land.
3. **Product name — LOCKED:** **Blue Hen RE** (*RE* = RAG Embeddings). Primary domain:
   **bhenre.com**. Codename / folder: `bluehenre`. GitHub: `henington-homes` (optional rename later).
4. **Hosting — LOCKED (ADR-002):** Railway for `core-api` + `worker`; Neon for Postgres
   (Vercel Marketplace on hub project). **Operator still needed:** provision Neon, execute
   `INF-003`, attach Railway artifact volume before prod training. Modal GPU tier TBD when
   Spec 0011 is prioritized. Agents: local-first Ollama (`SYNTH_LOCAL_LLM_BASE_URL`) or served
   open-weights endpoint for max-quality tier.

## 8. Guardrails (do not regress)

- `SCIENCE_REVIEW.md` is normative: no fabricated citations, no "100% accurate" copy, biology
  is "inspired by" not "equivalent," quintic (not cubic) Newton-Schulz.
- Every claim becomes a CI **evaluation gate** (WHITEPAPER §8), not prose.
- Spec-driven: code traces to a spec; ML changes need an eval gate; production deploys need
  Operator approval.
- **v1 (Phases A–B):** analytics and simulation only — no live trading, no order execution,
  no money movement. Finance org evaluates **fictional strategies** on retrieved context.
- **v2 (Phase C):** real trading account replication requires a separate spec, compliance
  review, and explicit Operator approval — not built until A+B gates pass.

## 9. Verification (cumulative)

**ASN math (packages/asn-engine):**
- effective rank: rank-1 → ~1.0; isotropic Gaussian → ~full dimension.
- Procrustes, InfoNCE, three-tier surgery: passing unit tests.
- Newton-Schulz: quintic band [0.68, 1.13] + cubic σ→1 per `SCIENCE_REVIEW.md` §3. ✅
- **WHITEPAPER gate 1:** **0/4** Phase A sites @ 10 ep fleet (`pnpm evidence:fleet`); heterosynaptic ŵ + peak–drop trigger wired; 7–11 surgeries/run but eval erank below InfoNCE. Hub nDCG +0.011. See `EVIDENCE.md` §3 Run B + §3.2–3.3 (three-tier **rejected** for collapse).
- **Retraction:** ~62 deploy erank came from `train_loop` measuring random noise (fixed).

**Evidence refresh:** `pnpm evidence:collect` · `pnpm evidence:fleet` · `uv run python scripts/engine_proof.py`

**Platform (2026-06-30):**
- Phase A orgs trained, deployed, indexed (8 chunks/org); `/v1/search` pgvector live.
- core-api tests: healthz, **readyz**, workspace provisioning, RLS isolation, problem+json.
- CI: site review + ASN tests (~17) + core-api tests (~21) — `.github/workflows/ci.yml`.
  DB-dependent tests skip when Postgres unavailable (`conftest.py`).

**Science integrity:** `SCIENCE_REVIEW.md` normative — measure, don't assert; quintic not cubic.
