"""Tenant metadata contracts (Spec 0024 / RECO-004): versioned per-tenant
schemas validated loud at write time. v1 supports the JSON-Schema subset
{type, properties, required, enum} — enough for filtering contracts
without a new dependency; full jsonschema adoption is a lockfile decision.

Reserved namespace `_bh.*` is platform-owned: tenants cannot declare it,
and when present it must carry the platform types."""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.database import db_session
from app.models import TenantMetaContract

RESERVED = {
    "_bh.source": str,
    "_bh.docId": str,
    "_bh.ts": str,
    "_bh.consent": bool,
    "_bh.lang": str,
}
FILTERABLE_TYPES = ("keyword", "number", "date", "geo")
_TYPE_MAP = {"string": str, "number": (int, float), "integer": int,
             "boolean": bool, "object": dict, "array": list}


def _check_schema_shape(schema: dict, filterable: list[dict]) -> None:
    props = schema.get("properties")
    if not isinstance(props, dict) or not props:
        raise ValueError("json_schema.properties must be a non-empty object")
    for name, spec in props.items():
        if not re.match(r"^[A-Za-z_][A-Za-z0-9_.-]{0,63}$", name) or "'" in name:
            raise ValueError(f"property name {name!r}: letters/digits/_/./- only, max 64 chars")
        if name.startswith("_bh."):
            raise ValueError(f"{name!r}: the _bh.* namespace is platform-reserved")
        if not isinstance(spec, dict) or spec.get("type") not in _TYPE_MAP:
            raise ValueError(f"properties[{name!r}].type must be one of {list(_TYPE_MAP)}")
    declared = set(props)
    for f in filterable:
        if not isinstance(f, dict) or f.get("type") not in FILTERABLE_TYPES:
            raise ValueError(f"filterable entries need type in {FILTERABLE_TYPES}")
        if f.get("name") not in declared:
            raise ValueError(f"filterable field {f.get('name')!r} is not declared in properties")


def register(workspace_id: uuid.UUID, json_schema: dict,
             filterable: list[dict] | None = None) -> dict:
    filterable = filterable or []
    _check_schema_shape(json_schema, filterable)
    with db_session(workspace_id) as session:
        latest = session.scalar(
            select(TenantMetaContract.version)
            .where(TenantMetaContract.workspace_id == workspace_id)
            .order_by(TenantMetaContract.version.desc()).limit(1)) or 0
        row = TenantMetaContract(
            id=uuid.uuid4(), workspace_id=workspace_id, version=latest + 1,
            json_schema=json_schema, filterable=filterable,
            created_at=datetime.now(timezone.utc))
        session.add(row)
        version = row.version
    _ensure_filter_indexes(workspace_id, filterable)
    return {"version": version, "filterable": filterable}


_INDEX_CASTS = {"keyword": "", "number": "::numeric", "date": "::timestamptz"}


def _ensure_filter_indexes(workspace_id: uuid.UUID, filterable: list[dict]) -> None:
    """Spec 0024 §4: declarations compile to infrastructure. Best-effort —
    registration never fails on index DDL."""
    from sqlalchemy import text as _text

    ws8 = str(workspace_id).replace("-", "")[:8]
    for f in filterable:
        cast = _INDEX_CASTS.get(f["type"])
        if cast is None:
            continue  # geo: deferred
        name = f["name"]
        if not re.match(r"^[A-Za-z_][A-Za-z0-9_.-]{0,63}$", name):
            continue
        safe = "".join(c for c in name if c.isalnum() or c == "_")[:32]
        try:
            with db_session() as session:
                session.execute(_text(
                    f"CREATE INDEX IF NOT EXISTS idx_meta_{ws8}_{safe} "
                    f"ON document_chunks (((payload->>'{name}'){cast})) "
                    f"WHERE workspace_id = '{workspace_id}'"))
        except Exception:
            pass


def active(workspace_id: uuid.UUID) -> dict | None:
    with db_session(workspace_id) as session:
        row = session.scalar(
            select(TenantMetaContract)
            .where(TenantMetaContract.workspace_id == workspace_id)
            .order_by(TenantMetaContract.version.desc()).limit(1))
        if row is None:
            return None
        return {"version": row.version, "json_schema": row.json_schema,
                "filterable": row.filterable}


def validate_metadata(contract: dict, metadata: dict, where: str = "metadata") -> None:
    """Reject loud with the offending path; never coerce silently."""
    schema = contract["json_schema"]
    props: dict = schema.get("properties", {})
    for key in schema.get("required", []):
        if key not in metadata:
            raise ValueError(f"{where}.{key}: required by contract v{contract['version']}")
    for key, value in metadata.items():
        if key.startswith("_bh."):
            want = RESERVED.get(key)
            if want is None:
                raise ValueError(f"{where}.{key}: unknown reserved key")
            if not isinstance(value, want):
                raise ValueError(f"{where}.{key}: must be {want.__name__}")
            continue
        spec = props.get(key)
        if spec is None:
            raise ValueError(
                f"{where}.{key}: not declared in contract v{contract['version']}")
        want = _TYPE_MAP[spec["type"]]
        if isinstance(value, bool) and want is not bool and spec["type"] != "boolean":
            raise ValueError(f"{where}.{key}: must be {spec['type']}")
        if not isinstance(value, want):
            raise ValueError(f"{where}.{key}: must be {spec['type']}")
        if "enum" in spec and value not in spec["enum"]:
            raise ValueError(f"{where}.{key}: not in enum {spec['enum']}")


def validate_documents_against_contract(workspace_id: uuid.UUID,
                                        documents: list[dict]) -> int | None:
    """Returns the contract version enforced, or None when the tenant has
    no contract (schemaless tenants stay schemaless until they opt in)."""
    contract = active(workspace_id)
    if contract is None:
        return None
    from app.services.usage import record as record_usage

    for i, doc in enumerate(documents):
        meta = doc.get("metadata") or {}
        try:
            validate_metadata(contract, meta, where=f"documents[{i}].metadata")
        except ValueError:
            record_usage(workspace_id, "contract-reject")
            raise
    return contract["version"]
