"""Pure unit tests for embedding serving tiers (no Postgres required).

Tests the pure helpers `quantize_int8` and `apply_serving_tier` in models_svc.
These do not touch the DB, so they run without docker/Alembic/Postgres.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

# Make the core-api `app` package importable regardless of pytest invocation dir.
CORE_API_DIR = Path(__file__).resolve().parents[1]
if str(CORE_API_DIR) not in sys.path:
    sys.path.insert(0, str(CORE_API_DIR))

from app.services.models_svc import apply_serving_tier, quantize_int8  # noqa: E402


def _l2(vec: list[float]) -> float:
    return math.sqrt(sum(v * v for v in vec))


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na, nb = _l2(a), _l2(b)
    return dot / (na * nb)


# --------------------------------------------------------------------------- #
# quantize_int8
# --------------------------------------------------------------------------- #


def test_quantize_int8_roundtrip_small_error():
    vec = [0.10, -0.42, 0.31, 0.77, -0.05, 1.0, -1.0, 0.0]
    out = quantize_int8(vec)
    assert len(out) == len(vec)
    # scale = max(abs)/127 = 1/127, so per-element error <= scale/2.
    scale = max(abs(v) for v in vec) / 127.0
    for o, v in zip(out, vec):
        assert abs(o - v) <= scale  # within one quantization step
    # round-trip stays on the same scale (max abs preserved closely)
    assert abs(max(abs(o) for o in out) - max(abs(v) for v in vec)) <= scale


def test_quantize_int8_values_snap_to_grid():
    vec = [1.0, 0.5, 0.25, -0.75]
    out = quantize_int8(vec)
    scale = 1.0 / 127.0
    for o in out:
        # every dequantized value is an integer multiple of the scale
        assert abs(o / scale - round(o / scale)) < 1e-6


def test_quantize_int8_all_zero():
    assert quantize_int8([0.0, 0.0, 0.0]) == [0.0, 0.0, 0.0]


def test_quantize_int8_accepts_tensor_like():
    class FakeTensor:
        def __init__(self, data):
            self._data = data

        def tolist(self):
            return list(self._data)

    out = quantize_int8(FakeTensor([0.2, -0.4, 0.6]))
    assert isinstance(out, list)
    assert len(out) == 3


# --------------------------------------------------------------------------- #
# apply_serving_tier
# --------------------------------------------------------------------------- #


def test_full_tier_renormalizes_only():
    vec = [3.0, 4.0]  # norm 5
    out = apply_serving_tier(vec, truncate_dims=None, quant=None)
    assert len(out) == 2
    assert math.isclose(_l2(out), 1.0, rel_tol=1e-9, abs_tol=1e-9)
    # direction preserved
    assert math.isclose(out[0], 0.6, abs_tol=1e-9)
    assert math.isclose(out[1], 0.8, abs_tol=1e-9)


def test_truncation_length_and_unit_norm_before_quant():
    vec = [0.1 * i for i in range(1, 33)]  # 32-dim
    out = apply_serving_tier(vec, truncate_dims=8, quant=None)
    assert len(out) == 8
    # renormalized to ~unit norm (no quant on this path)
    assert math.isclose(_l2(out), 1.0, rel_tol=1e-9, abs_tol=1e-9)
    # truncation takes the leading prefix (Matryoshka), so direction of first 8
    # matches the renormalized raw prefix
    raw_prefix = vec[:8]
    n = _l2(raw_prefix)
    expected = [v / n for v in raw_prefix]
    for o, e in zip(out, expected):
        assert math.isclose(o, e, abs_tol=1e-9)


def test_int8_tier_changes_values_but_stays_near_unit_norm():
    vec = [0.05 * i for i in range(1, 17)]
    full = apply_serving_tier(vec, truncate_dims=None, quant=None)
    int8 = apply_serving_tier(vec, truncate_dims=None, quant="int8")
    assert len(int8) == len(full)
    # quantization perturbs values
    assert int8 != full
    # but only slightly: still close to unit norm
    assert math.isclose(_l2(int8), 1.0, abs_tol=0.05)
    # and very close to the pre-quant vector
    assert _cosine(int8, full) > 0.999


def test_int8_preserves_cosine_ranking():
    # query closest to a, then b, then c (by construction)
    query = [1.0, 0.0, 0.0, 0.0]
    a = [0.9, 0.1, 0.0, 0.0]
    b = [0.5, 0.5, 0.0, 0.0]
    c = [0.0, 0.0, 1.0, 0.0]

    def served(v):
        return apply_serving_tier(v, truncate_dims=None, quant="int8")

    q, sa, sb, sc = served(query), served(a), served(b), served(c)
    score_a = _cosine(q, sa)
    score_b = _cosine(q, sb)
    score_c = _cosine(q, sc)
    assert score_a > score_b > score_c


def test_truncate_then_int8_full_pipeline():
    vec = [0.02 * i for i in range(1, 65)]  # 64-dim
    out = apply_serving_tier(vec, truncate_dims=16, quant="int8")
    assert len(out) == 16
    # near unit norm after truncate+renorm+quant
    assert math.isclose(_l2(out), 1.0, abs_tol=0.05)


def test_apply_serving_tier_accepts_tensor_like():
    class FakeTensor:
        def __init__(self, data):
            self._data = data

        def tolist(self):
            return list(self._data)

    out = apply_serving_tier(FakeTensor([3.0, 4.0]), truncate_dims=None, quant=None)
    assert isinstance(out, list)
    assert math.isclose(_l2(out), 1.0, abs_tol=1e-9)
