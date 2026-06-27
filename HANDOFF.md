# HANDOFF — SynthaEmbed OS (codename `bluehenre`)

Paste-ready context for starting the **code** session. Read top to bottom once; it's written
so a fresh coding agent (Cursor) can pick up without re-deriving anything.

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
WHITEPAPER.md            ← the scientific center (ASN, v3, vetted)
SCIENCE_REVIEW.md        ← integrity audit (what's real / dropped / to verify) — NORMATIVE
PLAN.md                  ← architecture + spec-driven plan (§11 = current built architecture)
specs/0001..0006         ← spec-driven dev; code must trace to a spec
apps/
  synthorg/              ← Vercel Eve synthetic org (Chief of Staff + 4 lifecycle subagents)
  org-template/          ← Next.js mini-org dashboard (sub-org site)
  web/                   ← (reserved: control plane) — not yet built
services/
  core-api/             ← FastAPI: THE single uniform chokepoint (in-memory skeleton, runs)
  trainer/              ← Modal serverless GPU: 4 lifecycle stage functions (skeleton)
packages/
  asn-engine/           ← ASN math in PyTorch + tests (VERIFIED: erank, Newton-Schulz, etc.)
  synth-core/           ← uniform SDK + cross-language tracing (x-synth-* headers)
  cli/                  ← `synth` CLI over synth-core (humans/CI use the same calls as agents)
infra/, docs/           ← (placeholders to fill)
```

## 2. Architecture in five sentences

1. **One engine, many tenants:** all mini-orgs share `asn-engine`; isolation is data-only
   (Postgres RLS on `workspace_id`, per-tenant vector namespace + cost ceiling) — spec 0002.
2. **Synthetic org = Vercel Eve app:** a Chief of Staff director delegates the lifecycle to
   `data_harvester` / `training_orchestrator` / `qa_benchmark` / `field_operator` subagents.
3. **Unified access + tracing (spec 0006):** every agent tool, the `synth` CLI, CI, and the
   dashboard reach ALL services/dbs through `synth-core` → `core-api`; every call is a span
   with actor+target, propagated TS↔Python via `x-synth-*` headers, replayable with
   `synth trace view <id>`. No component calls a service directly.
4. **Compute on Modal:** the 4 stages are serverless GPU functions importing `asn-engine`.
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

## 4. Status: real vs. stubbed (so you know what to implement)

**Real / verified now:**
- ASN math in `packages/asn-engine` (effective rank, quintic Newton-Schulz, InfoNCE,
  cosine-contrastive, Procrustes, three-tier surgery) + unit tests. Math numerically verified.
- `synth-core` SDK + trace contract; `synth` CLI; Eve agent tree (typed tools w/ Zod);
  `core-api` route surface (in-memory); `org-template` dashboard. All Python compiles.

**Stubbed / TODO (the code work):**
- `core-api`: swap in-memory stores for **Neon Postgres + pgvector + RLS** (Alembic
  migrations); real auth (API key hash + JWT); wire `/v1/train|eval` to Modal via Vercel
  Connect (OIDC).
- `services/trainer`: implement the real loops (MLM selective-mask; LMAR chunking; ASN
  contrastive+zELO training using `asn-engine`; eval gates; MRL+quant + registry I/O).
- `asn-engine`: training loop that wires the trigger→surgery→orthogonalize schedule
  (Algorithm 1 in WHITEPAPER §4.5); zELO distillation head.
- Eve: confirm subagent wiring against bundled docs (`node_modules/eve/docs`) after install;
  map eve session id → `SYNTH_TRACE_ID` so one session = one trace.
- A lint/review gate forbidding direct service/db access outside `synth-core` (spec 0006).

## 5. First coding tasks (suggested order, each spec-gated)

1. `pnpm install` + `uv sync`; get `core-api` and `org-template` running locally; confirm
   `synth healthz`/ledger/trace round-trip end-to-end (spec 0006 acceptance tests).
2. Stand up **Neon + pgvector + RLS** and migrate `core-api` off in-memory (spec 0002, 0004).
   Add the cross-tenant **negative isolation tests** (highest-severity gate).
3. Implement `asn-engine` training loop + first **evaluation gate** in CI (WHITEPAPER §8):
   ASN holds effective rank above InfoNCE baseline at equal nDCG@10.
4. Wire `trainer` stage 1–2 on Modal (domain-adapt + ASN train) behind `/v1/train` with trace
   propagation; prove `synth trace view` shows TS→Python spans in one trace.
5. Stages 3–4 (eval gates + compress/deploy); bind **Phase A** (RAG Benchmark Lab), then
   **Phase B** (finance applied-test org with fictional strategy backtests) as separate tenants.

## 6. Run it locally

```bash
pnpm install
uv sync
cp .env.example .env            # set SYNTH_LOCAL_LLM_BASE_URL for local agents
docker compose -f infra/docker-compose.yml up -d   # (add compose; postgres+pgvector, redis)
uv run uvicorn app.main:app --reload --app-dir services/core-api    # :8000 chokepoint
pnpm --filter @synthaembed/org-template dev                          # :3000 dashboard
pnpm --filter @synthaembed/synthorg dev                              # eve agent (Node 24+)
uv run pytest packages/asn-engine                                    # math tests (pass today)
node --experimental-strip-types packages/cli/src/index.ts ledger tail   # the `synth` CLI
```
(Ollama: `ollama pull qwen3` then `ollama serve` for free local agents.)

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
2. **GitHub / Vercel — LOCKED:** Repurpose **`jcdavis131/henington-homes`**
   (https://github.com/jcdavis131/henington-homes). Local folder `bluehenre` pushes here;
   prior Henington Homes app is replaced (history preserved only on old `main` until force-push).
   Vercel: existing `bhre.vercel.app` linkage — set **Root Directory** to `apps/org-template`
   (or deploy `apps/synthorg` separately for Eve). Update env vars per `.env.example`.
3. **Product name** (SynthaEmbed OS vs. something else; folder is `bluehenre`).
4. **Hosting**: Neon project, Modal account/GPU tiers, and whether agents run fully local
   (Ollama) or via a served open-weights endpoint.

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

## 9. Verification done this session

- ASN math numerically verified (rank-1 erank→1.0; isotropic→~62/64; Newton-Schulz σ→1;
  Procrustes recovers rotation). All Python compiles (`py_compile`).
- Platform/science claims web-verified: Vercel Eve, Workflows, zELO (arXiv:2509.12541),
  Projection-head IB (arXiv:2503.00507), awake-mouse sleep (Nature Neuroscience 2026),
  Kimi K2.5/K2.6, Qwen3 local viability. (Couldn't run servers — pip/npm network blocked in
  this environment; everything runs where deps install.)
