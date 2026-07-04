"""Spec 0024: contract shape checks + metadata validation (no DB)."""

import pytest

from app.services import contracts


GOOD = {"version": 3, "json_schema": {
    "properties": {
        "price": {"type": "number"},
        "beds": {"type": "integer"},
        "city": {"type": "string", "enum": ["Newark", "Wilmington"]},
    },
    "required": ["price"],
}}


def test_schema_shape_rejects_reserved_declarations():
    with pytest.raises(ValueError, match="platform-reserved"):
        contracts._check_schema_shape(
            {"properties": {"_bh.source": {"type": "string"}}}, [])


def test_schema_shape_rejects_undeclared_filterable():
    with pytest.raises(ValueError, match="not declared"):
        contracts._check_schema_shape(
            {"properties": {"price": {"type": "number"}}},
            [{"name": "beds", "type": "number"}])


def test_validate_requires_required():
    with pytest.raises(ValueError, match=r"metadata\.price: required"):
        contracts.validate_metadata(GOOD, {"beds": 3})


def test_validate_rejects_undeclared_key():
    with pytest.raises(ValueError, match="not declared in contract v3"):
        contracts.validate_metadata(GOOD, {"price": 1.0, "sqft": 900})


def test_validate_rejects_wrong_type_and_bool_trap():
    with pytest.raises(ValueError, match="must be number"):
        contracts.validate_metadata(GOOD, {"price": True})


def test_validate_enum():
    with pytest.raises(ValueError, match="not in enum"):
        contracts.validate_metadata(GOOD, {"price": 1.0, "city": "Dover"})


def test_validate_reserved_types():
    with pytest.raises(ValueError, match="_bh.consent: must be bool"):
        contracts.validate_metadata(GOOD, {"price": 1.0, "_bh.consent": "yes"})


def test_validate_accepts_conformant():
    contracts.validate_metadata(GOOD, {
        "price": 350000.0, "beds": 4, "city": "Newark",
        "_bh.consent": True, "_bh.source": "mls-feed",
    })
