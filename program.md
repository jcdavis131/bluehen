# Blue Hen RE — autoresearch program

Adapted from [karpathy/autoresearch](https://github.com/karpathy/autoresearch): agents iterate on **one training file** under a **fixed time budget** and **fixed metric**; humans iterate on **this file** (research org rules).

---

## Literature radar (weekly — before new hypotheses)

Research org must not reinvent arXiv. Before proposing a new loss or architecture:

1. Run `pnpm literature:radar` (or `uv run python scripts/arxiv_literature_radar.py --write-md`).
2. Read `data/literature/radar_latest.md` — review **flagged** papers for overlap.
3. Check `config/literature_registry.json` — if published, status must be `shipped`, `evaluating`, or `watchlist`; add entry before coding.
4. Update registry when adopting or rejecting a published method.

Frontier synthesis (what we combine, not reinvent): `docs/FRONTIER_ARCHITECTURE.md`.

**Team backlog (embedding + RAG):** `config/work_queue.json` (unified) — sync autoresearch with `pnpm research:sync-queue`.

Data org: `pnpm harvest:arxiv` refreshes `data/corpora/research-rag/corpus.jsonl` from latest CS.CL/retrieval abstracts.

---

## The loop (one experiment)

```
1. Read EVIDENCE.md + literature_registry + data/autoresearch/progress.jsonl
2. Edit ONLY scripts/autoresearch_train.py
3. uv run python scripts/autoresearch_run.py [cursor|claude]
4. **KEEP** → champion auto-promoted; **DISCARD** → auto-revert to `data/autoresearch/champion_train.py`
   (also wired: `.cursor/hooks/autoresearch-after-run.ps1` + `autoresearch_run.py`)
5. Repeat until time budget or hypothesis resolved
```

Target throughput: **~12 experiments/hour** on synthetic (3 min wall clock each), like autoresearch's ~12/hour at 5 min/GPU.

---

## Files (do not blur roles)

| File | Who edits | Role |
|---|---|---|
| **`program.md`** | Human | Research org: priors, gates, what to try next |
| **`scripts/autoresearch_prepare.py`** | Human only | Fixed metric, data, eval — **never modify in agent runs** |
| **`scripts/autoresearch_train.py`** | **Agent** | Model, loss, optimizer, training loop — **only file agents touch** |
| **`scripts/autoresearch_run.py`** | Human only | Wall-clock runner, KEEP/DISCARD, logging |
| **`EVIDENCE.md`** | Human + agent append | Measured claims ledger |

Everything else (`sweep.py`, `bayes_search.py`, `train_loop.py`, production worker) is **downstream** — promote winners here only after synthetic KEEP streak.

---

## Fixed metric (lower friction = higher score)

**Primary (synthetic, autoresearch):** `robust_score` — higher is better

```
robust_score = knn_full + 0.5·knn_t8 + 0.5·knn_int8
```

Same as Wave 2 in `SWEEP_REPORT.md`. Optimizes **retrieval quality + edge serving** (Matryoshka t=8 + int8), not raw rank alone.

**Constraints (hard fail → DISCARD):**
- `knn_full` must not drop more than **0.02** below session best
- `served_rank` must stay **≥ 8** (no dimensional collapse)

**Promotion to real text (tier 2):** only after **3 consecutive KEEP** on synthetic with same recipe family.

---

## Fixed time budget

- **`TIME_BUDGET_SEC = 180`** (3 minutes wall clock, training only)
- Comparable across architecture/batch changes — autoresearch's core design choice
- Do **not** sweep epoch counts; let the loop run until time runs out

---

## Priors (from EVIDENCE — do not re-litigate without new code)

| Claim | Status | Implication for train.py |
|---|---|---|
| Weight surgery anti-collapse | **Rejected** | Do not add three-tier surgery / spectral ops |
| VICReg on synthetic collapse | **Supported** | OK for alignment/SimSiam-like objectives |
| VICReg on InfoNCE real text | **Neutral** | Don't optimize for VICReg alone on InfoNCE |
| Domain fine-tune beats zero-shot | **Supported** | Product thesis; validate in tier 2 |
| Barlow Twins (Wave 2 interim) | **Leading** | Good starting point; beat `best_score` in log |

---

## What to try (ordered)

1. **Beat the baseline** in `data/autoresearch/best.json` on `robust_score`
2. **Method:** barlow, infonce, vicreg, mrl, rankfloor — not surgery/sleep
3. **Architecture:** prefer depth=1, width 128–256, no expander unless it helped before
4. **Batch/lr:** explore inside train.py; TPE (`bayes_search.py`) is for parallel search — autoresearch is for **coherent diffs** one hypothesis at a time
5. After synthetic winner: run `domain_sweep.py` arm (Family C) — real-text gate

---

## What NOT to do

- Do not run 500× grids on confirmed mechanisms (see `docs/EXPERIMENT_STRATEGY.md`)
- Do not edit `autoresearch_prepare.py`, `sweep.py` eval, or `train_loop.py` during autoresearch nights
- Do not claim SOTA until MTEB slice passes (tier 2)
- Do not enable `asn.enabled` surgery in production recipes without tier-1 tenant gain

---

## Agent session prompt (copy-paste)

```
You are the Blue Hen RE autoresearch agent.

Read program.md and EVIDENCE.md §3–§5.
Read data/autoresearch/progress.jsonl and data/autoresearch/best.json.

Edit ONLY scripts/autoresearch_train.py to improve robust_score.
Run: uv run python scripts/autoresearch_run.py

If output says KEEP, leave train.py changed and summarize the hypothesis in one sentence.
If DISCARD, revert train.py and try a different hypothesis.

Do not modify any other file unless best.json improved — then append one line to EVIDENCE.md changelog.
```

---

## Relation to Bayesian TPE

| Mode | When | Tool |
|---|---|---|
| **Autoresearch loop** | Agent proposes *structured code changes* (new loss terms, arch) | `autoresearch_train.py` + `autoresearch_run.py` |
| **Bayesian TPE** | Search *continuous hyperparams* around a fixed code shape | `bayes_search.py`, `bayesian_search.py` |

Use autoresearch for **architecture/loss research**; use TPE to **dial in coefficients** once code shape stabilizes.

---

## Morning checklist

1. `tail data/autoresearch/progress.jsonl` — experiment log
2. `cat data/autoresearch/best.json` — current champion
3. If best improved: run `uv run python scripts/sweep.py --aggregate data/sweeps --report SWEEP_REPORT.md`
4. Update EVIDENCE.md if tier-2 promotion criteria met
