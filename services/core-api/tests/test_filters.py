"""RECO-005: filter DSL compilation + validation (no DB)."""

import pytest

from app.services.filters import compile_filters

CONTRACT = {"version": 2, "filterable": [
    {"name": "city", "type": "keyword"},
    {"name": "price", "type": "number"},
    {"name": "listed", "type": "date"},
    {"name": "location", "type": "geo"},
]}


def test_no_filters_is_noop():
    assert compile_filters(None, {}) == ("", {})


def test_filters_without_contract_rejected():
    with pytest.raises(ValueError, match="require a metadata contract"):
        compile_filters(None, {"city": "Newark"})


def test_undeclared_field_rejected():
    with pytest.raises(ValueError, match="not declared filterable in contract v2"):
        compile_filters(CONTRACT, {"sqft": 900})


def test_geo_deferred():
    with pytest.raises(ValueError, match="PostGIS"):
        compile_filters(CONTRACT, {"location": {"gte": 1}})


def test_wrong_operator_for_type():
    with pytest.raises(ValueError, match="not allowed for type keyword"):
        compile_filters(CONTRACT, {"city": {"gte": "A"}})


def test_number_type_enforced():
    with pytest.raises(ValueError, match="expected a number"):
        compile_filters(CONTRACT, {"price": {"lte": "cheap"}})


def test_compiles_parameterized():
    sql, params = compile_filters(CONTRACT, {
        "city": {"in": ["Newark", "Wilmington"]},
        "price": {"gte": 100000, "lte": 500000},
        "listed": {"gte": "2026-01-01"},
    })
    assert "payload->>'city' = ANY(:f0_in)" in sql
    assert "(payload->>'price')::numeric >= :f1_gte" in sql
    assert "(payload->>'listed')::timestamptz >= :f2_gte" in sql
    assert params["f0_in"] == ["Newark", "Wilmington"]
    assert params["f1_lte"] == 500000
    # no raw user values ever appear in the SQL text
    assert "Newark" not in sql and "500000" not in sql
