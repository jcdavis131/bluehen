#!/usr/bin/env python3
"""Run one autoresearch experiment — fixed budget, KEEP/DISCARD, auto-revert."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))

from autoresearch_prepare import (  # noqa: E402
    AUTORESEARCH_DIR,
    TIME_BUDGET_SEC,
    TRAIN_STEPS,
    check_constraints,
    evaluate_multi_seed,
    load_best,
    log_run,
)
from autoresearch_train import build_and_train  # noqa: E402
from autoresearch_utils import promote_train, revert_train  # noqa: E402


def main() -> int:
    agent = sys.argv[1] if len(sys.argv) > 1 else "cursor"
    best = load_best()
    print(f"[agent={agent}] baseline robust_score={best.get('robust_score', '?')}", flush=True)
    print(f"time budget={TIME_BUDGET_SEC}s train_steps={TRAIN_STEPS}", flush=True)

    t0 = time.time()
    model = build_and_train(budget_sec=TIME_BUDGET_SEC, train_steps=TRAIN_STEPS)
    train_secs = time.time() - t0

    metrics = evaluate_multi_seed(model)
    ok, reason = check_constraints(metrics, best)
    improved = metrics["robust_score"] > best.get("robust_score", 0)
    keep = ok and improved

    if keep:
        reason = f"improved robust_score {best.get('robust_score')} -> {metrics['robust_score']}"
        promote_train(reason=f"KEEP agent={agent}")
    else:
        if not ok:
            pass  # reason already set
        elif not improved:
            reason = f"no improvement ({metrics['robust_score']} <= {best.get('robust_score')})"
        revert_train(reason=f"DISCARD agent={agent}")

    log_run(metrics=metrics, secs=train_secs, keep=keep, reason=f"[{agent}] {reason}")

    result = {"agent": agent, "keep": keep, "reason": reason, **metrics}
    AUTORESEARCH_DIR.mkdir(parents=True, exist_ok=True)
    (AUTORESEARCH_DIR / "last_run.json").write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(f"\n  knn_full={metrics['knn_full']}  knn_t8={metrics['knn_t8']}  knn_int8={metrics['knn_int8']}")
    print(f"  served_rank={metrics['served_rank']}  robust_score={metrics['robust_score']}")
    print(f"  train_secs={train_secs:.1f}")
    print(f"\n  >>> {'KEEP' if keep else 'DISCARD'}: {reason}\n")
    return 0 if keep else 1


if __name__ == "__main__":
    raise SystemExit(main())
