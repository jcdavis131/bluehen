"""Synthetic training run generator.

Produces a realistic ASN-shaped run (contrastive loss decay, effective-rank
trajectory with an induced collapse + surgery recovery, R2D curvature per
block) so the training console has data before any real training happens.
Clearly tagged ``demo`` — never mixed with evidence runs.
"""

from __future__ import annotations

import math
import random

from runboard.run import init
from runboard.store import RunStore
from runboard.telemetry import RankMonitor, r2d_curvature


def generate_demo_run(
    steps: int = 200,
    seed: int = 7,
    store: RunStore | None = None,
    collapse_at: int | None = 90,
) -> str:
    rng = random.Random(seed)
    run = init(
        project="autoresearch-demo",
        name="asn-demo-barlow",
        config={
            "loss": "barlow",
            "lr": 3e-4,
            "batch": 64,
            "d_model": 256,
            "depth": 4,
            "seed": seed,
            "demo": True,
        },
        tags=["demo", "synthetic"],
        store=store,
    )
    monitor = RankMonitor(floor=12.0, on_alert=lambda a: run.log_event(
        "collapse_alert", f"effective rank {a['rank']:.1f} — {a['reason']}", a
    ))

    rank = 48.0
    surgery_done = False
    for step in range(steps):
        loss = 2.4 * math.exp(-step / 60.0) + 0.15 + rng.gauss(0, 0.02)
        # rank drifts down; induced collapse then surgery recovery
        if collapse_at is not None and collapse_at <= step < collapse_at + 12:
            rank = max(6.0, rank - 3.5)
        elif collapse_at is not None and step == collapse_at + 12 and not surgery_done:
            run.log_event(
                "surgery",
                "three-tiered spectral surgery + heterosynaptic decay triggered",
                {"tier": 2, "rankBefore": rank},
            )
            surgery_done = True
        elif surgery_done and rank < 40.0:
            rank += 2.2
        else:
            rank = max(20.0, rank - 0.05 + rng.gauss(0, 0.4))

        layer_ranks = [rank * f + rng.gauss(0, 0.5) for f in (0.55, 0.8, 0.95, 1.0)]
        curvature = r2d_curvature(layer_ranks)
        metrics = {
            "train/loss": round(loss, 4),
            "train/lr": 3e-4 * (0.5 * (1 + math.cos(math.pi * step / steps))),
            "asn/effective_rank": round(rank, 3),
            "asn/rank_floor": 12.0,
            "eval/ndcg10": round(min(0.72, 0.30 + step / steps * 0.45 + rng.gauss(0, 0.01)), 4),
        }
        for i, c in enumerate(curvature):
            metrics[f"asn/r2d_curvature_b{i + 1}"] = round(c, 4)
        run.log(metrics, step=step)
        monitor.update(rank)

    run.set_summary(best_ndcg10=0.72, final_effective_rank=round(rank, 2))
    run.finish()
    return run.run_id
