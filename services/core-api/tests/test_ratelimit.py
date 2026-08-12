"""client_ip() must resist a spoofed X-Forwarded-For header (SEC finding,
2026-08-12): trusting the left-most XFF entry let any caller mint a fresh
rate-limit / signup-abuse identity on every request just by setting the
header themselves. Behind N trusted reverse-proxy hops, only the Nth entry
from the *right* was actually appended by infrastructure we control."""

from __future__ import annotations

import importlib

import app.ratelimit as ratelimit


class _FakeClient:
    def __init__(self, host: str) -> None:
        self.host = host


class _FakeRequest:
    """Minimal stand-in — client_ip only touches .headers and .client.host."""

    def __init__(self, headers: dict[str, str], peer: str | None = "203.0.113.9"):
        self.headers = headers
        self.client = _FakeClient(peer) if peer else None


def _with_hops(monkeypatch, hops: int):
    monkeypatch.setattr(ratelimit, "TRUSTED_PROXY_HOPS", hops)


def test_spoofed_xff_is_ignored_with_one_trusted_hop(monkeypatch):
    _with_hops(monkeypatch, 1)
    # Client sets an arbitrary left-most value; the trusted edge proxy
    # appends the real peer address as the last (right-most) hop.
    req = _FakeRequest({"x-forwarded-for": "9.9.9.9, 198.51.100.7"})
    assert ratelimit.client_ip(req) == "198.51.100.7"


def test_varying_the_spoofed_prefix_does_not_change_identity(monkeypatch):
    _with_hops(monkeypatch, 1)
    real_hop = "198.51.100.7"
    ips = {
        ratelimit.client_ip(_FakeRequest({"x-forwarded-for": f"{spoof}, {real_hop}"}))
        for spoof in ("1.1.1.1", "2.2.2.2", "attacker-controlled")
    }
    assert ips == {real_hop}


def test_two_trusted_hops_reads_second_from_right(monkeypatch):
    _with_hops(monkeypatch, 2)
    req = _FakeRequest({"x-forwarded-for": "9.9.9.9, 198.51.100.7, 10.0.0.5"})
    assert ratelimit.client_ip(req) == "198.51.100.7"


def test_no_trusted_proxy_ignores_header_entirely(monkeypatch):
    _with_hops(monkeypatch, 0)
    req = _FakeRequest({"x-forwarded-for": "9.9.9.9"}, peer="203.0.113.9")
    assert ratelimit.client_ip(req) == "203.0.113.9"


def test_missing_header_falls_back_to_socket_peer(monkeypatch):
    _with_hops(monkeypatch, 1)
    req = _FakeRequest({}, peer="203.0.113.9")
    assert ratelimit.client_ip(req) == "203.0.113.9"


def test_short_chain_falls_back_to_socket_peer(monkeypatch):
    # Fewer hops in the header than trusted proxies means the header can't
    # be trusted either — fall back rather than trust an attacker value.
    _with_hops(monkeypatch, 2)
    req = _FakeRequest({"x-forwarded-for": "9.9.9.9"}, peer="203.0.113.9")
    assert ratelimit.client_ip(req) == "203.0.113.9"


def test_default_env_var_parses_to_one_hop():
    importlib.reload(ratelimit)
    assert ratelimit.TRUSTED_PROXY_HOPS == 1
