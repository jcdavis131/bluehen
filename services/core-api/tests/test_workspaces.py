"""Workspace provisioning tests."""

from __future__ import annotations

import os
import uuid

import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = os.environ.get("DATABASE_URL", "postgresql+psycopg://synth:synth@localhost:5433/synthaembed")
os.environ["API_SECRET_KEY"] = "test-admin-key"

from app.main import app  # noqa: E402

from conftest import requires_postgres  # noqa: E402

ADMIN = {"Authorization": "Bearer test-admin-key"}


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_healthz(client):
    res = client.get("/healthz")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


@requires_postgres
def test_readyz(client):
    res = client.get("/readyz")
    assert res.status_code == 200
    assert res.json()["status"] == "ready"


@requires_postgres
def test_create_workspace_and_budget(client):
    site_id = f"test-org-{uuid.uuid4().hex[:8]}"
    res = client.post(
        "/v1/workspaces",
        json={"name": "Test Org", "siteId": site_id},
        headers=ADMIN,
    )
    assert res.status_code == 201
    body = res.json()
    assert body["apiKey"]
    key = body["apiKey"]

    budget = client.get("/v1/budget", headers={"Authorization": f"Bearer {key}"})
    assert budget.status_code == 200
    assert budget.json()["ceilingUsd"] == 50
