"""Durable lead storage tests (REV-904)."""

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

from conftest import requires_postgres  # noqa: E402

ADMIN = {"Authorization": "Bearer test-admin-key"}


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def _make_workspace(client) -> str:
    """Provision a workspace and return its tenant API key."""
    site_id = f"leads-org-{uuid.uuid4().hex[:8]}"
    res = client.post(
        "/v1/workspaces",
        json={"name": "Leads Test Org", "siteId": site_id},
        headers=ADMIN,
    )
    assert res.status_code == 201
    return res.json()["apiKey"]


@requires_postgres
def test_create_lead_persists_and_lists(client):
    key = _make_workspace(client)
    auth = {"Authorization": f"Bearer {key}"}

    res = client.post(
        "/v1/leads",
        json={
            "name": "Ada Lovelace",
            "email": "ada@example.com",
            "company": "Analytical Engine Co",
            "topic": "managed-embeddings",
            "message": "We need domain-specific retrieval for technical docs.",
            "source": "storefront/contact",
        },
        headers=auth,
    )
    assert res.status_code == 201
    assert res.json()["ok"] is True
    lead_id = res.json()["id"]
    assert isinstance(lead_id, int)

    listed = client.get("/v1/leads", headers=auth)
    assert listed.status_code == 200
    leads = listed.json()["leads"]
    assert any(l["id"] == lead_id and l["email"] == "ada@example.com" for l in leads)


@requires_postgres
def test_create_lead_waitlist_shape(client):
    """Waitlist signups use interest, not message — must still persist."""
    key = _make_workspace(client)
    auth = {"Authorization": f"Bearer {key}"}

    res = client.post(
        "/v1/leads",
        json={"email": "waiter@example.com", "interest": "signal-lab", "source": "simulation/waitlist"},
        headers=auth,
    )
    assert res.status_code == 201
    listed = client.get("/v1/leads", headers=auth)
    match = [l for l in listed.json()["leads"] if l["email"] == "waiter@example.com"]
    assert match and match[0]["message"] == "signal-lab"


@requires_postgres
def test_create_lead_rejects_invalid_email(client):
    key = _make_workspace(client)
    res = client.post(
        "/v1/leads",
        json={"email": "not-an-email", "message": "hello"},
        headers={"Authorization": f"Bearer {key}"},
    )
    assert res.status_code == 400


@requires_postgres
def test_create_lead_rejects_missing_content(client):
    key = _make_workspace(client)
    res = client.post(
        "/v1/leads",
        json={"email": "empty@example.com"},
        headers={"Authorization": f"Bearer {key}"},
    )
    assert res.status_code == 400


@requires_postgres
def test_create_lead_requires_auth(client):
    res = client.post("/v1/leads", json={"email": "anon@example.com", "message": "hi"})
    assert res.status_code == 401
