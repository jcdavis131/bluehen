"""Sleep-consolidation experiment — advancing VICReg with the AwakenedSleepNet idea.

BIO-INSPIRED, NOT BIO-EQUIVALENT (SCIENCE_REVIEW §2). Builds on EVIDENCE §3.4: the loss-space
VICReg rank floor prevents collapse where weight surgery failed. Here we ask whether a
wake/sleep schedule can do the same anti-collapse job while applying the regularizer only
during periodic 'sleep', plus homeostatic downscaling (SHY) and dream pruning.

Same synthetic collapse regime as collapse_lossreg.py (invariance-only objective collapses).
Four arms, identical data/seed/total-wake-steps:
  1. baseline            : invariance only (collapses)
  2. vicreg_continuous   : invariance + VICReg every step (our working fix)
  3. sleep_homeostatic   : wake (invariance) + nightly downscale+prune, NO consolidation loss
                           -> isolates whether downscaling/pruning ALONE prevent collapse
  4. sleep_consolidate   : wake (invariance) + nightly downscale+prune + a few VICReg-only
                           replay 'dream' steps -> the full AwakenedSleepNet cycle

Key comparison: does arm 4 match arm 2's effective rank / kNN while running VICReg on far
fewer steps (efficiency), and does arm 3 confirm that homeostasis without the loss is not
enough? Honest report — record whatever happens.

Run:  packages/asn-engine/.venv/Scripts/python.exe scripts/sleep_consolidation.py
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "packages" / "asn-engine"))
sys.path.insert(0, str(REPO / "scripts"))

import torch  # noqa: E402

from asn_engine.losses import covariance_regularization, variance_regularization  # noqa: E402
from asn_engine.sleep import sleep_phase  # noqa: E402
from asn_engine.spectral import effective_rank  # noqa: E402
from collapse_lossreg import Net, knn_accuracy, make_data  # noqa: E402

import os  # noqa: E402

AUG_SIGMA, BATCH = 1.0, 256
WAKE_STEPS = 800
DAY_LEN = int(os.getenv("DAY_LEN", "50"))         # wake steps per cycle before a 'night'
DREAM_STEPS = int(os.getenv("DREAM_STEPS", "10")) # VICReg-only consolidation steps per night
DOWNSCALE, PRUNE = 0.95, 0.02
SIM_COEF, VAR_COEF, COV_COEF = 25.0, 25.0, 1.0


def _vicreg(z1, z2):
    var = variance_regularization(z1) + variance_regularization(z2)
    cov = covariance_regularization(z1) + covariance_regularization(z2)
    return VAR_COEF * var + COV_COEF * cov


def train_arm(mode: str, seed: int):
    torch.manual_seed(seed)
    (x_tr, y_tr), (x_te, y_te) = make_data(seed)
    model = Net()
    opt = torch.optim.AdamW(model.parameters(), lr=1e-3)
    gen = torch.Generator().manual_seed(seed + 1)
    replay: list[torch.Tensor] = []
    vicreg_steps = 0

    def views():
        bi = torch.randint(0, x_tr.shape[0], (BATCH,), generator=gen)
        x = x_tr[bi]
        return x, x + AUG_SIGMA * torch.randn(x.shape, generator=gen), \
            x + AUG_SIGMA * torch.randn(x.shape, generator=gen)

    for step in range(WAKE_STEPS):
        x, v1, v2 = views()
        z1, z2 = model(v1), model(v2)
        inv = ((z1 - z2) ** 2).sum(-1).mean()
        # base task (invariance) is the same collapse driver for every arm
        if mode == "vicreg_continuous":
            loss = SIM_COEF * inv + _vicreg(z1, z2)
            vicreg_steps += 1
        else:
            loss = SIM_COEF * inv
        opt.zero_grad()
        loss.backward()
        opt.step()

        if mode.startswith("sleep"):
            replay.append(x.detach())
            if len(replay) > 8:
                replay.pop(0)
            if (step + 1) % DAY_LEN == 0:
                # --- night: homeostatic maintenance ---
                sleep_phase(model, downscale=DOWNSCALE, prune_frac=PRUNE)
                if mode == "sleep_consolidate":
                    for _ in range(DREAM_STEPS):
                        xr = replay[torch.randint(len(replay), (1,), generator=gen)]
                        d1 = model(xr + AUG_SIGMA * torch.randn(xr.shape, generator=gen))
                        d2 = model(xr + AUG_SIGMA * torch.randn(xr.shape, generator=gen))
                        cons = _vicreg(d1, d2)   # 'dream' = spread + decorrelate, no invariance pull
                        opt.zero_grad()
                        cons.backward()
                        opt.step()
                        vicreg_steps += 1

    model.eval()
    with torch.no_grad():
        er = effective_rank(model.serve(x_te))
        acc = knn_accuracy(model.serve(x_tr), y_tr, model.serve(x_te), y_te)
    return er, acc, vicreg_steps


def main() -> int:
    seeds = [0, 1, 2]
    raw = effective_rank(make_data(0)[1][0])
    arms = ["baseline", "vicreg_continuous", "sleep_homeostatic", "sleep_consolidate"]
    print(f"sleep-consolidation: synthetic collapse regime, wake_steps={WAKE_STEPS}, "
          f"day_len={DAY_LEN}, dream_steps={DREAM_STEPS}, downscale={DOWNSCALE}, prune={PRUNE}")
    print(f"raw input effective rank ~ {raw:.1f}, seeds={seeds}\n")

    agg: dict[str, list] = {a: [] for a in arms}
    for s in seeds:
        for a in arms:
            agg[a].append(train_arm(a, s))

    def mean(a, i):
        return sum(r[i] for r in agg[a]) / len(agg[a])

    print("  arm                   effRank   kNN acc   VICReg-steps")
    for a in arms:
        print(f"  {a:<20} {mean(a, 0):7.2f}   {mean(a, 1):.3f}     {int(mean(a, 2))}")

    base_er = mean("baseline", 0)
    vic_er, vic_acc = mean("vicreg_continuous", 0), mean("vicreg_continuous", 1)
    homeo_er = mean("sleep_homeostatic", 0)
    cons_er, cons_acc, cons_steps = mean("sleep_consolidate", 0), mean("sleep_consolidate", 1), mean("sleep_consolidate", 2)
    vic_steps = mean("vicreg_continuous", 2)

    print(f"\n  baseline collapsed? {'YES' if base_er < 0.8 * raw else 'NO'} ({base_er:.1f} vs raw {raw:.1f})")
    print(f"  homeostasis-only prevents collapse? {'yes' if homeo_er > 0.8 * raw else 'NO (loss is required)'} "
          f"({homeo_er:.1f})")
    matches = cons_er >= 0.9 * vic_er and cons_acc >= vic_acc - 0.01
    cheaper = cons_steps < 0.6 * vic_steps
    print(f"  sleep_consolidate vs vicreg_continuous: rank {cons_er:.1f} vs {vic_er:.1f}, "
          f"kNN {cons_acc:.3f} vs {vic_acc:.3f}, VICReg steps {int(cons_steps)} vs {int(vic_steps)}")
    if matches and cheaper:
        print("\n  RESULT: wake/sleep CONSOLIDATION matches continuous VICReg's anti-collapse "
              f"with ~{cons_steps/vic_steps:.0%} of the regularizer steps. Sleep schedule is a "
              "viable, cheaper anti-collapse path.")
    elif matches:
        print("\n  RESULT: sleep consolidation matches continuous VICReg (not cheaper here).")
    else:
        print("\n  RESULT: sleep consolidation does NOT match continuous VICReg. Honest negative.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
