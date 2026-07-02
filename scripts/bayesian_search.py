#!/usr/bin/env python3
"""Bayesian (TPE) experiment search over tiered hypotheses.

Replaces brute-force grids with Optuna Tree-structured Parzen Estimator sampling,
multi-seed aggregation per trial, and Beta-Binomial posterior tracking for promote/stop.

Run:
  uv run python scripts/bayesian_search.py --study vicreg_collapse --trials 40
  uv run python scripts/bayesian_search.py --study tenant_recipe --trials 16 --site hub
  uv run python scripts/bayesian_search.py --list
  uv run python scripts/bayesian_search.py --report
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean, stdev

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import optuna
from experiment_runners import (
    PHASE_A_SITES,
    run_infonce_surgery,
    run_invariance_vicreg,
    run_tenant_recipe,
)

REGISTRY = ROOT / "config" / "experiment_hypotheses.json"
BAYES_DIR = ROOT / "data" / "evidence" / "bayesian"
STUDY_DB = BAYES_DIR / "optuna.db"
RESULTS_PATH = BAYES_DIR / "study_results.json"
REPORT_PATH = ROOT / "BAYESIAN_EXPERIMENT_REPORT.md"


def load_registry() -> dict:
    return json.loads(REGISTRY.read_text(encoding="utf-8"))


def beta_posterior_mean(successes: int, failures: int, alpha0: float, beta0: float) -> float:
    return (alpha0 + successes) / (alpha0 + beta0 + successes + failures)


def suggest_param(trial: optuna.Trial, name: str, spec: dict):
    kind = spec["type"]
    if kind == "float":
        return trial.suggest_float(name, spec["low"], spec["high"])
    if kind == "logfloat":
        return trial.suggest_float(name, spec["low"], spec["high"], log=True)
    if kind == "int":
        step = spec.get("step", 1)
        return trial.suggest_int(name, spec["low"], spec["high"], step=step)
    raise ValueError(f"unknown param type {kind} for {name}")


def objective_vicreg_collapse(trial: optuna.Trial, cfg: dict, n_seeds: int) -> float:
    var_c = suggest_param(trial, "vicregVar", cfg["searchSpace"]["vicregVar"])
    cov_c = suggest_param(trial, "vicregCov", cfg["searchSpace"]["vicregCov"])
    steps = suggest_param(trial, "steps", cfg["searchSpace"]["steps"])

    lifts: list[float] = []
    knn_ok = 0
    for s in range(n_seeds):
        base = run_invariance_vicreg(seed=s, var_coef=0.0, cov_coef=0.0, steps=steps)
        out = run_invariance_vicreg(seed=s, var_coef=var_c, cov_coef=cov_c, steps=steps)
        lifts.append(out["servedEffRank"] - base["servedEffRank"])
        if out["knnAcc"] >= base["knnAcc"] - 0.01:
            knn_ok += 1

    trial.set_user_attr("meanRankLift", mean(lifts))
    trial.set_user_attr("knnPreserved", knn_ok / n_seeds)
    penalty = 0.0 if knn_ok == n_seeds else 5.0 * (1 - knn_ok / n_seeds)
    return mean(lifts) - penalty


def objective_surgery_futility(trial: optuna.Trial, cfg: dict, n_seeds: int) -> float:
    lam = suggest_param(trial, "asnLambda", cfg["searchSpace"]["asnLambda"])
    every = suggest_param(trial, "surgeryEvery", cfg["searchSpace"]["surgeryEvery"])
    k_strong = suggest_param(trial, "kStrong", cfg["searchSpace"]["kStrong"])

    deltas: list[float] = []
    for s in range(n_seeds):
        out = run_infonce_surgery(
            seed=s + 1000,
            asn_lambda=lam,
            surgery_every=every,
            k_strong=k_strong,
            k_tail=k_strong,
        )
        deltas.append(out["rankDelta"])

    trial.set_user_attr("meanRankDelta", mean(deltas))
    # maximize rank delta — expect negative; futility confirmed when best << 0
    return mean(deltas)


def objective_tenant_recipe(
    trial: optuna.Trial, cfg: dict, n_seeds: int, site_id: str
) -> float:
    vv = suggest_param(trial, "vicregVar", cfg["searchSpace"]["vicregVar"])
    vc = suggest_param(trial, "vicregCov", cfg["searchSpace"]["vicregCov"])
    temp = suggest_param(trial, "infoNceTemp", cfg["searchSpace"]["infoNceTemp"])
    epochs = suggest_param(trial, "epochs", cfg["searchSpace"]["epochs"])
    lr = suggest_param(trial, "lr", cfg["searchSpace"]["lr"])

    ndcgs: list[float] = []
    for s in range(n_seeds):
        out = run_tenant_recipe(
            site_id=site_id,
            seed=42 + s,
            vicreg_var=vv,
            vicreg_cov=vc,
            info_nce_temp=temp,
            epochs=epochs,
            lr=lr,
        )
        ndcgs.append(out["ndcg10"])

    trial.set_user_attr("meanNdcg", mean(ndcgs))
    trial.set_user_attr("siteId", site_id)
    return mean(ndcgs)


def run_study(
    study_id: str,
    *,
    n_trials: int,
    site: str | None,
    seed: int,
) -> dict:
    reg = load_registry()
    cfg = reg["studies"][study_id]
    tier = cfg["tier"]
    n_seeds = cfg.get("nSeedsPerTrial", 1)

    BAYES_DIR.mkdir(parents=True, exist_ok=True)
    storage = f"sqlite:///{STUDY_DB.as_posix()}"

    def _objective(trial: optuna.Trial) -> float:
        if study_id == "vicreg_collapse":
            return objective_vicreg_collapse(trial, cfg, n_seeds)
        if study_id == "surgery_futility":
            return objective_surgery_futility(trial, cfg, n_seeds)
        if study_id == "tenant_recipe":
            sid = site or trial.suggest_categorical("siteId", list(PHASE_A_SITES))
            return objective_tenant_recipe(trial, cfg, n_seeds, sid)
        raise ValueError(study_id)

    sampler = optuna.samplers.TPESampler(seed=seed)
    study = optuna.create_study(
        study_name=study_id,
        storage=storage,
        load_if_exists=True,
        direction="maximize",
        sampler=sampler,
    )

    print(f"Study {study_id} (tier {tier}): {n_trials} TPE trials, {n_seeds} seeds/trial", flush=True)
    study.optimize(_objective, n_trials=n_trials, show_progress_bar=False)

    best = study.best_trial
    prior = cfg.get("priorSuccess", 0.5)

    def _trial_success(t: optuna.trial.FrozenTrial) -> bool | None:
        if t.value is None:
            return None
        if study_id == "surgery_futility":
            # futility confirmed when rank delta ≤ 0 (surgery never helps)
            return float(t.value) <= 0.0
        return float(t.value) > 0.0

    successes = sum(1 for t in study.trials if _trial_success(t) is True)
    failures = sum(1 for t in study.trials if _trial_success(t) is False)
    posterior = beta_posterior_mean(successes, failures, prior * 10, (1 - prior) * 10)

    result = {
        "studyId": study_id,
        "tier": tier,
        "hypothesis": cfg["hypothesis"],
        "nTrials": len(study.trials),
        "bestValue": best.value,
        "bestParams": best.params,
        "bestAttrs": best.user_attrs,
        "priorSuccess": prior,
        "successes": successes,
        "failures": failures,
        "posteriorMean": round(posterior, 4),
        "finishedAt": datetime.now(timezone.utc).isoformat(),
    }

    all_results: dict = {}
    if RESULTS_PATH.exists():
        all_results = json.loads(RESULTS_PATH.read_text(encoding="utf-8"))
    all_results[study_id] = result
    RESULTS_PATH.write_text(json.dumps(all_results, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2), flush=True)
    return result


def generate_report() -> None:
    reg = load_registry()
    results = json.loads(RESULTS_PATH.read_text(encoding="utf-8")) if RESULTS_PATH.exists() else {}

    lines = [
        "# Bayesian Experiment Report",
        "",
        f"**Generated:** {datetime.now(timezone.utc).isoformat()}",
        "",
        "## Strategy",
        "",
        "Tiered hypotheses + **TPE (Tree-structured Parzen Estimator)** via Optuna.",
        "Each trial aggregates multiple seeds; **Beta-Binomial posterior** tracks P(hypothesis holds).",
        "",
        "| Tier | Cost | When to run |",
        "|---|---|---|",
        "| 0 mechanism | ~5s/trial | New collapse/surgery/VICReg mechanism questions |",
        "| 1 tenant_recipe | ~5min/trial | Recipe tuning per org corpus |",
        "| 2 real_text | ~30min/trial | Only promote tier-1 winners |",
        "",
        "## Studies",
        "",
    ]

    for sid, cfg in reg["studies"].items():
        lines += [f"### `{sid}` (tier {cfg['tier']})", "", f"**H:** {cfg['hypothesis']}", ""]
        if sid in results:
            r = results[sid]
            lines += [
                f"- Trials: {r['nTrials']}",
                f"- Best objective: **{r['bestValue']:.4f}**",
                f"- Best params: `{json.dumps(r['bestParams'])}`",
                f"- Posterior P(success): **{r['posteriorMean']:.3f}** (prior {r['priorSuccess']})",
                "",
            ]
        else:
            lines += ["- *Not run yet*", ""]

    lines += [
        "## Decision rules",
        "",
        "1. **Promote to tier 1** when tier-0 posterior ≥ 0.95 and best params stable across 20+ trials.",
        "2. **Stop futility studies** when posterior ≤ 0.10 after 12 trials (surgery_futility).",
        "3. **Per-tenant VICReg:** enable only if tenant_recipe best beats InfoNCE baseline by ΔnDCG ≥ 0.005.",
        "4. **Never brute-force 500×** the same confirmed mechanism — reallocate budget to tier 2 MTEB.",
        "",
        "## Commands",
        "",
        "```bash",
        "pnpm evidence:search -- --study vicreg_collapse --trials 40",
        "pnpm evidence:search -- --study surgery_futility --trials 24",
        "pnpm evidence:search -- --study tenant_recipe --trials 16 --site hub",
        "pnpm evidence:search:report",
        "```",
        "",
    ]
    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {REPORT_PATH}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Bayesian TPE experiment search")
    parser.add_argument("--study", help="Study id from config/experiment_hypotheses.json")
    parser.add_argument("--trials", type=int, help="Override n_trials")
    parser.add_argument("--site", help="Fix site for tenant_recipe study")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--report", action="store_true")
    args = parser.parse_args()

    if args.list:
        reg = load_registry()
        for sid, cfg in reg["studies"].items():
            print(f"  {sid}  tier={cfg['tier']}  trials={cfg.get('nTrialsDefault', '?')}")
        return

    if args.report:
        generate_report()
        return

    if not args.study:
        parser.error("--study required (or --list / --report)")

    reg = load_registry()
    if args.study not in reg["studies"]:
        parser.error(f"unknown study {args.study}")
    n_trials = args.trials or reg["studies"][args.study].get("nTrialsDefault", 30)
    run_study(args.study, n_trials=n_trials, site=args.site, seed=args.seed)
    generate_report()


if __name__ == "__main__":
    main()
