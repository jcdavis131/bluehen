"""API tests for omni-market simulation routes."""

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


@pytest.fixture(scope="module")
def tenant_headers(client):
    site_id = f"omni-test-{uuid.uuid4().hex[:8]}"
    res = client.post(
        "/v1/workspaces",
        json={"name": "Omni Test", "siteId": site_id},
        headers=ADMIN,
    )
    if res.status_code != 201:
        pytest.skip("workspace provisioning unavailable")
    return {"Authorization": f"Bearer {res.json()['apiKey']}"}


@requires_postgres
def test_omni_platforms(client, tenant_headers):
    res = client.get("/v1/omni/platforms", headers=tenant_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["mode"] == "simulation"
    assert any(p["id"] == "kalshi" for p in body["platforms"])


@requires_postgres
def test_omni_simulate_returns_simulation_mode(client, tenant_headers):
    res = client.post(
        "/v1/omni/simulate",
        headers=tenant_headers,
        json={"platformId": "kalshi", "strategyId": "test"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["mode"] == "simulation"
    assert "sharpe" in body


@requires_postgres
def test_omni_live_capital_forbidden(client, tenant_headers):
    res = client.post(
        "/v1/omni/simulate",
        headers=tenant_headers,
        json={"platformId": "kalshi", "liveCapital": True},
    )
    assert res.status_code == 403
