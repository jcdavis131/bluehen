"""Spec 0028 Rank Engine: pure-logic tests (no DB, no encoder)."""

import pytest

from app.services import rank as rank_svc


def test_cos_basic():
    assert rank_svc._cos([1, 0], [1, 0]) == pytest.approx(1.0)
    assert rank_svc._cos([1, 0], [0, 1]) == pytest.approx(0.0)


def test_boost_requires_declared_field():
    with pytest.raises(ValueError, match="contract-declared"):
        rank_svc._boost_score({"price": 5}, [{"field": "price"}],
                              {"filterable": []})


def test_boost_number_direction():
    contract = {"filterable": [{"name": "price", "type": "number"}]}
    hi, _ = rank_svc._boost_score({"price": 1000.0}, [{"field": "price"}], contract)
    lo, _ = rank_svc._boost_score({"price": 1.0}, [{"field": "price"}], contract)
    assert hi > lo
    hi_asc, _ = rank_svc._boost_score({"price": 1000.0},
                                      [{"field": "price", "direction": "asc"}], contract)
    assert hi_asc < hi


def test_boost_missing_value_is_honest_none():
    contract = {"filterable": [{"name": "price", "type": "number"}]}
    score, detail = rank_svc._boost_score({}, [{"field": "price"}], contract)
    assert detail["price"] is None
    assert score == 0.0


def test_rank_validates_items():
    import uuid
    with pytest.raises(ValueError, match="provide items or set useIndex"):
        rank_svc.rank(uuid.uuid4())
    with pytest.raises(ValueError, match="text is required"):
        rank_svc.rank(uuid.uuid4(), items=[{"id": "x"}])
    with pytest.raises(ValueError, match=f"at most {rank_svc.MAX_ITEMS}"):
        rank_svc.rank(uuid.uuid4(), items=[{"text": "t"}] * 201)
