# Experiment Strategy — Bayesian, Tiered, Hypothesis-Driven

> **Autoresearch mode:** For agent-driven overnight iteration (one editable file, fixed 3 min
> budget, KEEP/DISCARD), see [`program.md`](../program.md) and `pnpm autoresearch:run`.
> Use **this doc** for tier promotion rules and TPE; use **program.md** for the nightly loop.

**Problem with the 500× grid:** repeating the same confirmed mechanism (VICReg on synthetic
collapse) 100 times adds precision we already had at 3 seeds. Budget should follow **uncertainty**,
not habit.

**Principle:** Treat each question as a hypothesis with a prior, explore with **Bayesian
optimization (TPE)**, update a posterior, and **promote or kill** before spending GPU on the next tier.

---

## Three tiers

| Tier | Name | Cost/trial | Question type | Tool |
|---|---|---|---|---|
| **0** | Mechanism | ~5–30s | Does X prevent collapse / does surgery help? | `vicreg_collapse`, `surgery_futility` |
| **1** | Tenant recipe | ~3–8min | What recipe maximizes *this org's* nDCG? | `tenant_recipe` |
| **2** | Real text / MTEB | ~30min+ | Does the winner generalize? | `realtext_validation`, `mteb_slice` (TBD) |

**Promotion rule:** Tier 0 posterior P(success) ≥ 0.95 → allow tier 1. Tier 1 best beats baseline
ΔnDCG ≥ 0.005 → allow tier 2 for that site only.

**Futility rule:** Tier 0 posterior ≤ 0.10 after 12 trials → stop (e.g. surgery_futility).

---

## Bayesian workflow (not grid search)

```
Prior (from EVIDENCE.md)
    ↓
Optuna TPE proposes next params (explore/exploit)
    ↓
Run trial × n_seeds → scalar objective
    ↓
Beta-Binomial posterior update
    ↓
Report: best params + P(success) + promote/stop decision
```

**Why TPE over grid:** Grid wastes trials on redundant regions once VICReg var≈25 is known.
TPE concentrates on `{var, cov}` boundaries and interacts (e.g. high var + low cov).

**Why not 500×:** §3.8 showed 100/100 wins with 5 fixed arms — the *hypothesis is confirmed*.
Next 400 trials should ask *new* questions (surgery futility, per-site recipe, MTEB).

---

## Registered studies

Defined in `config/experiment_hypotheses.json`:

| Study | Prior | Objective | Default trials |
|---|---|---|---|
| `vicreg_collapse` | 0.85 | rank lift − kNN penalty | 40 |
| `surgery_futility` | 0.15 | rank Δ vs no surgery | 24 |
| `tenant_recipe` | 0.70 | tenant nDCG | 32 |

---

## What we already know (don't re-spend)

| Hypothesis | Posterior (informative) | Action |
|---|---|---|
| VICReg fixes synthetic collapse | ~0.99 | **Stop** tier-0 vicreg sweeps |
| Surgery anti-collapse on real corpora | ~0.05 | **Run** surgery_futility only to bound λ |
| VICReg helps real AG News | ~0.50 (neutral) | Tier 2 only if tenant_recipe promotes |
| Domain tune beats BGE on tenant | ~0.95 | **Product thesis** — tune tier 1 for recipe |
| VICReg helps hub nDCG | ~0.75 | Tier 1 `tenant_recipe` on hub |
| VICReg hurts research-rag | ~0.80 | Exclude or penalize VICReg in search |

---

## Commands

```bash
# List studies
uv run python scripts/bayesian_search.py --list

# Mechanism (fast — confirm/refine VICReg weights)
pnpm evidence:search -- --study vicreg_collapse --trials 40

# Futility test for surgery
pnpm evidence:search -- --study surgery_futility --trials 24

# Per-site recipe (expensive — use sparingly)
pnpm evidence:search -- --study tenant_recipe --trials 16 --site hub

# Report
pnpm evidence:search:report
```

Legacy brute-force grid (`experiment_campaign.py`) remains for regression only — prefer Bayesian.

---

## Next experiments (prioritized)

1. **`surgery_futility`** — 24 TPE trials; expect posterior → 0.05; closes surgery chapter.
2. **`tenant_recipe` × 4 sites** — 16 trials/site; output per-site best recipe JSON for worker.
3. **MTEB slice** (tier 2) — only for recipes that beat baseline in (2).
4. **Update WHITEPAPER §8** — document Bayesian protocol as the evaluation methodology.
