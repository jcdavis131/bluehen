"""Dataset entitlement + signed download (Spec 0021 P3)."""

from __future__ import annotations

import os
import uuid

import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = os.environ.get(
    "DATABASE_URL", "postgresql+psycopg://synth:synth@localhost:5433/synthaembed"
)
os.environ["API_SECRET_KEY"] = "test-admin-key"

from app.main import app  # noqa: E402
from app.services import catalog  # noqa: E402

from conftest import requires_postgres  # noqa: E402

ADMIN = {"Authorization": "Bearer test-admin-key"}


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@requires_postgres
def test_fulfill_and_download_token_roundtrip(client, tmp_path, monkeypatch):
    slug = f"test-ds-{uuid.uuid4().hex[:8]}"
    ds_dir = tmp_path / slug
    ds_dir.mkdir()
    chunks = ds_dir / "chunks.jsonl"
    chunks.write_text('{"text":"hello","doc_id":"d1"}\n', encoding="utf-8")
    manifest = ds_dir / "manifest.json"
    manifest.write_text(
        f'{{"dataset_id":"{slug}","name":"Test DS","doc_count":1,"chunk_count":1,"stats":{{}}}}',
        encoding="utf-8",
    )
    monkeypatch.setenv("DATALAB_DIR", str(tmp_path))

    sync = client.post("/v1/admin/catalog/sync", headers=ADMIN)
    assert sync.status_code == 200

    order_id = f"order_{uuid.uuid4().hex[:12]}"
    fulfill = client.post(
        "/v1/admin/catalog/fulfill",
        json={"orderId": order_id, "datasetSlug": slug, "email": "buyer@example.com"},
        headers=ADMIN,
    )
    assert fulfill.status_code == 201

    dl = client.post(f"/v1/catalog/datasets/{slug}/download", json={"orderId": order_id})
    assert dl.status_code == 200
    body = dl.json()
    assert "url" in body and "expiresAt" in body
    assert slug in body["url"] and "token=" in body["url"]

    # Without entitlement → 403
    denied = client.post(f"/v1/catalog/datasets/{slug}/download", json={"orderId": "other"})
    assert denied.status_code == 403


@requires_postgres
def test_verify_download_token_unit():
    slug, order = "my-slug", "order_abc"
    expires = int(__import__("time").time()) + 3600
    token = catalog._sign_download_token(slug, order, expires)
    assert catalog.verify_download_token(slug, order, expires, token)
    assert not catalog.verify_download_token(slug, order, expires, "bad")
