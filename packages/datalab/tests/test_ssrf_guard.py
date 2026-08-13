"""_guard_ssrf validates a hostname's DNS answer once; the HTTP client
(httpx, or a browser driver inside crawl4ai) resolves the same hostname
again, independently, when it actually opens the connection. If those two
lookups disagree — DNS rebinding, trivial with a short TTL and an
attacker-controlled name server — a hostname that passed the guard can
still end up connecting to a private address. `pinned_resolution` closes
that TOCTOU window by pinning the connect-time lookup to the addresses the
guard already approved.
"""

from __future__ import annotations

import socket
from unittest.mock import patch

import pytest

from datalab.ingest import _guard_ssrf, pinned_resolution

PUBLIC_INFO = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 0))]
PRIVATE_INFO = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 0))]
OTHER_PUBLIC_INFO = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("203.0.113.9", 0))]


def test_guard_ssrf_rejects_private_address():
    with patch("socket.getaddrinfo", return_value=PRIVATE_INFO):
        with pytest.raises(PermissionError):
            _guard_ssrf("https://internal.example.com/x")


def test_guard_ssrf_allows_public_address_and_returns_infos():
    with patch("socket.getaddrinfo", return_value=PUBLIC_INFO):
        infos = _guard_ssrf("https://public.example.com/x")
    assert infos == PUBLIC_INFO


def test_pinned_resolution_passes_through_stable_public_address():
    with patch("socket.getaddrinfo", return_value=PUBLIC_INFO):
        with pinned_resolution("https://public.example.com/x"):
            # Simulates the HTTP client's own, later lookup for the same
            # host+port pair at connect time.
            results = socket.getaddrinfo("public.example.com", 443)
    assert [r[4][0] for r in results] == ["93.184.216.34"]


def test_pinned_resolution_blocks_dns_rebinding_to_private_address():
    calls = {"n": 0}

    def fake_getaddrinfo(host, *args, **kwargs):
        calls["n"] += 1
        # First lookup (the guard's check) sees a public address; the
        # second lookup (the simulated connect) has rebound to loopback.
        return PUBLIC_INFO if calls["n"] == 1 else PRIVATE_INFO

    with patch("socket.getaddrinfo", side_effect=fake_getaddrinfo):
        with pinned_resolution("https://rebind.example.com/x"):
            with pytest.raises(socket.gaierror):
                socket.getaddrinfo("rebind.example.com", 443)


def test_pinned_resolution_blocks_rebinding_to_a_different_public_address_too():
    """Pinning is exact-match, not just a private/public re-check — a
    connect-time answer that differs from what was validated is refused
    even if the new address is itself public (defense in depth against a
    validated-then-swapped target, not only loopback/RFC1918 targets)."""
    calls = {"n": 0}

    def fake_getaddrinfo(host, *args, **kwargs):
        calls["n"] += 1
        return PUBLIC_INFO if calls["n"] == 1 else OTHER_PUBLIC_INFO

    with patch("socket.getaddrinfo", side_effect=fake_getaddrinfo):
        with pinned_resolution("https://swap.example.com/x"):
            with pytest.raises(socket.gaierror):
                socket.getaddrinfo("swap.example.com", 443)


def test_pinned_resolution_does_not_affect_other_hostnames():
    def fake_getaddrinfo(host, *args, **kwargs):
        return PUBLIC_INFO if host == "public.example.com" else OTHER_PUBLIC_INFO

    with patch("socket.getaddrinfo", side_effect=fake_getaddrinfo):
        with pinned_resolution("https://public.example.com/x"):
            # A lookup for an unrelated host is untouched by the pin.
            results = socket.getaddrinfo("other.example.com", 443)
    assert [r[4][0] for r in results] == ["203.0.113.9"]


def test_pinned_resolution_restores_getaddrinfo_on_exit():
    with patch("socket.getaddrinfo", return_value=PUBLIC_INFO) as mocked:
        with pinned_resolution("https://public.example.com/x"):
            assert socket.getaddrinfo is not mocked
        assert socket.getaddrinfo is mocked


def test_pinned_resolution_restores_getaddrinfo_even_if_block_raises():
    with patch("socket.getaddrinfo", return_value=PUBLIC_INFO) as mocked:
        with pytest.raises(RuntimeError):
            with pinned_resolution("https://public.example.com/x"):
                raise RuntimeError("boom")
        assert socket.getaddrinfo is mocked


def test_pinned_resolution_is_noop_when_private_targets_allowed(monkeypatch):
    monkeypatch.setenv("DATALAB_ALLOW_PRIVATE", "1")
    with patch("socket.getaddrinfo", return_value=PRIVATE_INFO) as mocked:
        with pinned_resolution("https://internal.example.com/x"):
            assert socket.getaddrinfo is mocked
