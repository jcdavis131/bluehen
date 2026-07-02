"""Postgres RLS tenant isolation tests."""

from __future__ import annotations

import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text

os.environ["DATABASE_URL"] = os.environ.get("DATABASE_URL", "postgresql+psycopg://synth:synth@localhost:5433/synthaembed")
os.environ["API_SECRET_KEY"] = "test-admin-key"

from app.database import db_session  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Collection  # noqa: E402

ADMIN = {"Authorization": "Bearer test-admin-key"}


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def _create_org(client: TestClient, site_id: str) -> uuid.UUID:
    res = client.post(
        "/v1/workspaces",
        json={"name": f"RLS {site_id}", "siteId": site_id},
        headers=ADMIN,
    )
    assert res.status_code == 201
    return uuid.UUID(res.json()["workspaceId"])


from conftest import requires_postgres  # noqa: E402


@requires_postgres
def test_rls_isolates_collections(client):
    wid_a = _create_org(client, f"rls-a-{uuid.uuid4().hex[:8]}")
    wid_b = _create_org(client, f"rls-b-{uuid.uuid4().hex[:8]}")

    col_id = uuid.uuid4()
    with db_session(wid_a) as session:
        session.add(
            Collection(
                id=col_id,
                workspace_id=wid_a,
                corpus_uri="rls-test",
                doc_count=1,
                chunk_count=1,
                meta={"chunks": [{"id": "c1", "text": "tenant a secret"}]},
            )
        )

    with db_session(wid_b) as session:
        count = session.scalar(select(Collection).where(Collection.id == col_id))
        assert count is None

    with db_session(wid_a) as session:
        row = session.scalar(select(Collection).where(Collection.id == col_id))
        assert row is not None
        assert row.workspace_id == wid_a


@requires_postgres
def test_rls_isolates_document_chunks(client):
    wid_a = _create_org(client, f"rls-chunk-a-{uuid.uuid4().hex[:8]}")
    wid_b = _create_org(client, f"rls-chunk-b-{uuid.uuid4().hex[:8]}")
    col_id = uuid.uuid4()

    with db_session(wid_a) as session:
        session.add(Collection(id=col_id, workspace_id=wid_a, corpus_uri="x", doc_count=0))
        session.flush()
        session.execute(
            text(
                """
                INSERT INTO document_chunks
                  (workspace_id, collection_id, chunk_id, text, model_version, embedding)
                VALUES
                  (:wid, :cid, 'c1', 'secret', 'test-v1', :emb)
                """
            ),
            {"wid": str(wid_a), "cid": str(col_id), "emb": "[" + ",".join(["0.1"] * 384) + "]"},
        )

    with db_session(wid_b) as session:
        count = session.execute(
            text("SELECT count(*) FROM document_chunks WHERE workspace_id = :wid"),
            {"wid": str(wid_a)},
        ).scalar_one()
        assert count == 0


def test_problem_json_on_validation_error(client):
    res = client.post("/v1/workspaces", json={}, headers=ADMIN)
    assert res.status_code == 422
    assert res.headers["content-type"].startswith("application/problem+json")
    body = res.json()
    assert body["status"] == 422
    assert "detail" in body
