"""RECO-005 (Spec 0024 §4): the /v1/recommend filter DSL, compiled from
the tenant's metadata contract. Filters can only reference declared
filterable fields; every fragment is parameterized — field names are
whitelisted by the contract, never interpolated from user input raw."""

from __future__ import annotations

import re

_SAFE_FIELD = re.compile(r"^[A-Za-z_][A-Za-z0-9_.-]{0,63}$")
_OPS_BY_TYPE = {
    "keyword": {"eq", "in"},
    "number": {"eq", "gte", "lte"},
    "date": {"gte", "lte"},
}


def compile_filters(contract: dict | None, filters: dict) -> tuple[str, dict]:
    """Returns (sql_fragment, params). Raises ValueError with the exact
    offense — undeclared field, wrong operator, geo (deferred), or no
    contract at all."""
    if not filters:
        return "", {}
    if contract is None:
        raise ValueError("filters require a metadata contract — register one via POST /v1/contracts")

    declared = {f["name"]: f["type"] for f in contract.get("filterable", [])}
    frags: list[str] = []
    params: dict = {}
    for idx, (field, cond) in enumerate(filters.items()):
        ftype = declared.get(field)
        if ftype is None:
            raise ValueError(
                f"filter field {field!r} is not declared filterable in contract v{contract['version']}")
        if ftype == "geo":
            raise ValueError(f"filter field {field!r}: geo filtering pending PostGIS adoption (Spec 0024)")
        if not _SAFE_FIELD.match(field):
            raise ValueError(f"filter field {field!r}: invalid field name")

        conds = cond if isinstance(cond, dict) else {"eq": cond}
        allowed = _OPS_BY_TYPE[ftype]
        for op, value in conds.items():
            if op not in allowed:
                raise ValueError(f"{field}: operator {op!r} not allowed for type {ftype} (allowed: {sorted(allowed)})")
            key = f"f{idx}_{op}"
            accessor = f"payload->>'{field}'"
            if ftype == "number":
                accessor = f"({accessor})::numeric"
                if not isinstance(value, (int, float)) or isinstance(value, bool):
                    raise ValueError(f"{field}.{op}: expected a number")
            elif ftype == "date":
                accessor = f"({accessor})::timestamptz"
                if not isinstance(value, str):
                    raise ValueError(f"{field}.{op}: expected an ISO date string")
            if op == "eq":
                frags.append(f"{accessor} = :{key}")
                params[key] = value
            elif op == "in":
                if not isinstance(value, list) or not value:
                    raise ValueError(f"{field}.in: expected a non-empty list")
                frags.append(f"{accessor} = ANY(:{key})")
                params[key] = [str(v) for v in value]
            elif op == "gte":
                frags.append(f"{accessor} >= :{key}")
                params[key] = value
            elif op == "lte":
                frags.append(f"{accessor} <= :{key}")
                params[key] = value
    return (" AND " + " AND ".join(frags), params) if frags else ("", {})
