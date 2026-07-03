"""Head-only training path (1 GB prod containers)."""

import torch

from asn_engine.train_loop import train_head_on_features


def _toy_features(n=32, dim=64, seed=7):
    g = torch.Generator().manual_seed(seed)
    anchors = torch.randn(n, dim, generator=g)
    positives = anchors + 0.05 * torch.randn(n, dim, generator=g)
    return anchors, positives


def test_train_head_on_features_learns_and_reports():
    feats_a, feats_p = _toy_features()
    recipe = {"epochs": 2, "batchSize": 8, "projOutDim": 48, "projHiddenDim": 96}
    head, final_loss, er = train_head_on_features(feats_a, feats_p, recipe)
    assert final_loss > 0.0
    assert 1.0 <= er <= 48.0
    out = head(feats_a[:4])
    assert out.shape == (4, 48)


def test_progress_callback_fires():
    feats_a, feats_p = _toy_features(n=16)
    seen = []
    train_head_on_features(
        feats_a, feats_p, {"epochs": 1, "batchSize": 8, "projOutDim": 32, "projHiddenDim": 64},
        progress=seen.append,
    )
    assert seen and seen[-1]["surgeries"] == 0  # no ASN surgery on this path
