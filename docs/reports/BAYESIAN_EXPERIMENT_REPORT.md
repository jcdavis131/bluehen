# Bayesian Experiment Report

**Generated:** 2026-06-28T18:01:14.568176+00:00

## Strategy

Tiered hypotheses + **TPE (Tree-structured Parzen Estimator)** via Optuna.
Each trial aggregates multiple seeds; **Beta-Binomial posterior** tracks P(hypothesis holds).

| Tier | Cost | When to run |
|---|---|---|
| 0 mechanism | ~5s/trial | New collapse/surgery/VICReg mechanism questions |
| 1 tenant_recipe | ~5min/trial | Recipe tuning per org corpus |
| 2 real_text | ~30min/trial | Only promote tier-1 winners |

## Studies

### `vicreg_collapse` (tier 0)

**H:** VICReg coefficients restore served rank in invariance-only collapse without kNN loss

- *Not run yet*

### `surgery_futility` (tier 0)

**H:** Three-tier weight surgery does not improve rank under InfoNCE (futility test)

- Trials: 7
- Best objective: **-13.3142**
- Best params: `{"asnLambda": 0.49382849013642327, "surgeryEvery": 50, "kStrong": 12}`
- Posterior P(success): **0.094** (prior 0.15)

### `tenant_recipe` (tier 1)

**H:** Domain InfoNCE (+ optional VICReg) maximizes tenant nDCG vs zero-shot commercial

- *Not run yet*

## Decision rules

1. **Promote to tier 1** when tier-0 posterior ≥ 0.95 and best params stable across 20+ trials.
2. **Stop futility studies** when posterior ≤ 0.10 after 12 trials (surgery_futility).
3. **Per-tenant VICReg:** enable only if tenant_recipe best beats InfoNCE baseline by ΔnDCG ≥ 0.005.
4. **Never brute-force 500×** the same confirmed mechanism — reallocate budget to tier 2 MTEB.

## Commands

```bash
pnpm evidence:search -- --study vicreg_collapse --trials 40
pnpm evidence:search -- --study surgery_futility --trials 24
pnpm evidence:search -- --study tenant_recipe --trials 16 --site hub
pnpm evidence:search:report
```
