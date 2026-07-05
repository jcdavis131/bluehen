"""Provider-abstracted billing (Spec 0034 §3): one interface, swappable
rails. BTCPay Server (open source, self-hosted, Operator-custody
wallet) is the default adapter; Stripe implements the same interface.

Until the merchant identity connects (the ONE Operator action, §5),
checkout honestly refuses with instructions — it never pretends."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import urllib.request
import uuid

PRICES = {  # Spec 0034 §1 — set under the zero-involvement mandate
    "api-builder": {"usd": 29, "recurring": "month", "grants": "tier:builder"},
    "api-pro": {"usd": 99, "recurring": "month", "grants": "tier:pro"},
    "dataset": {"usd": 49, "recurring": None, "grants": "dataset:{slug}"},
    "certification": {"usd": 99, "recurring": None, "grants": "cert:run"},
}


class BillingNotConnected(Exception):
    pass


def _btcpay_conf() -> tuple[str, str, str]:
    url = os.getenv("BTCPAY_URL")
    store = os.getenv("BTCPAY_STORE_ID")
    key = os.getenv("BTCPAY_API_KEY")
    if not (url and store and key):
        raise BillingNotConnected(
            "payments are not connected yet — the merchant identity "
            "(BTCPay wallet or Stripe account) is the one owner action "
            "this business still needs; everything else is automated")
    return url.rstrip("/"), store, key


def create_checkout(workspace_id: uuid.UUID, sku: str,
                    slug: str | None = None) -> dict:
    """Returns a hosted checkout URL for the sku. BTCPay adapter."""
    if sku not in PRICES:
        raise ValueError(f"unknown sku {sku!r}")
    url, store, key = _btcpay_conf()
    price = PRICES[sku]
    grants = price["grants"].replace("{slug}", slug or "")
    body = json.dumps({
        "amount": str(price["usd"]),
        "currency": "USD",
        "metadata": {"workspaceId": str(workspace_id), "sku": sku,
                     "grants": grants},
    }).encode()
    req = urllib.request.Request(
        f"{url}/api/v1/stores/{store}/invoices", data=body,
        headers={"Authorization": f"token {key}",
                 "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        inv = json.loads(r.read().decode())
    return {"checkoutUrl": inv.get("checkoutLink"),
            "invoiceId": inv.get("id"), "sku": sku, "usd": price["usd"]}


def handle_webhook(raw_body: bytes, signature: str | None) -> dict:
    """BTCPay webhook -> entitlement grant. HMAC-verified; settlement
    events only; idempotent via the entitlement uniqueness."""
    secret = os.getenv("BTCPAY_WEBHOOK_SECRET")
    if not secret:
        raise BillingNotConnected("webhook secret not configured")
    expect = "sha256=" + hmac.new(secret.encode(), raw_body,
                                  hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expect, signature or ""):
        raise PermissionError("bad webhook signature")

    event = json.loads(raw_body.decode())
    if event.get("type") not in ("InvoiceSettled", "InvoicePaymentSettled"):
        return {"ignored": event.get("type")}
    meta = (event.get("metadata") or {})
    ws = meta.get("workspaceId")
    grants = meta.get("grants")
    if not (ws and grants):
        return {"ignored": "no metadata"}

    from app.services.entitlements import grant

    grant(uuid.UUID(ws), grants, granted_by="btcpay-webhook")
    return {"granted": grants, "workspaceId": ws}
