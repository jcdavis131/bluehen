"""Ingestion: URLs and local files → SourceDoc (markdown-normalized).

Adapter ladder per source type — best tool if installed, degraded but
correct fallback otherwise:

    HTML   crawl4ai (AI-native crawl, fit-markdown)  →  httpx + tag-strip
    PDF    marker (layout/tables/math preserved)     →  pypdf text  →  error
    text   direct read
"""

from __future__ import annotations

import re
from html import unescape
from pathlib import Path

from datalab.schemas import SourceDoc

_BLOCK_TAGS = re.compile(
    r"</(p|div|section|article|li|tr|h[1-6]|blockquote)>|<br\s*/?>", re.IGNORECASE
)
_DROP = re.compile(
    r"<(script|style|nav|footer|header|noscript)\b.*?</\1>", re.IGNORECASE | re.DOTALL
)
_TAG = re.compile(r"<[^>]+>")
_HEADING = re.compile(r"<h([1-6])[^>]*>(.*?)</h\1>", re.IGNORECASE | re.DOTALL)


def html_to_markdown(html: str) -> str:
    """Dependency-free HTML → markdown (fallback path)."""
    html = _DROP.sub(" ", html)
    html = _HEADING.sub(lambda m: "\n" + "#" * int(m.group(1)) + " " + _TAG.sub("", m.group(2)) + "\n", html)
    html = _BLOCK_TAGS.sub("\n", html)
    text = unescape(_TAG.sub(" ", html))
    lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in text.splitlines()]
    return "\n".join(ln for ln in lines if ln)


def _guard_ssrf(url: str) -> None:
    """Refuse private/loopback/link-local targets unless explicitly allowed.

    The pipeline may run on hosts with internal services (core-api, Postgres);
    a crawled source list must not become a proxy into them. Set
    DATALAB_ALLOW_PRIVATE=1 for deliberate intranet collection.
    """
    import ipaddress
    import os
    import socket
    from urllib.parse import urlparse

    if os.environ.get("DATALAB_ALLOW_PRIVATE") == "1":
        return
    host = urlparse(url).hostname or ""
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as e:
        raise RuntimeError(f"cannot resolve host {host!r}") from e
    for info in infos:
        addr = ipaddress.ip_address(info[4][0])
        if addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved:
            raise PermissionError(
                f"refusing to fetch private address {addr} for {host!r} "
                "(set DATALAB_ALLOW_PRIVATE=1 to allow)"
            )


def fetch_url(url: str, timeout: float = 30.0, _hops: int = 0) -> SourceDoc:
    """Fetch a web page as markdown. Prefers crawl4ai; falls back to httpx."""
    _guard_ssrf(url)
    try:
        return _fetch_crawl4ai(url)
    except ImportError:
        pass
    import httpx

    resp = httpx.get(url, timeout=timeout, follow_redirects=False, headers={
        "User-Agent": "bluehenre-datalab/0.1 (+research pipeline)"
    })
    if resp.is_redirect:
        if _hops >= 5:
            raise RuntimeError(f"too many redirects fetching {url}")
        location = str(resp.next_request.url) if resp.next_request else ""
        if not location:
            raise RuntimeError(f"redirect without location from {url}")
        return fetch_url(location, timeout=timeout, _hops=_hops + 1)  # re-guard each hop
    resp.raise_for_status()
    md = html_to_markdown(resp.text)
    title_m = re.search(r"<title[^>]*>(.*?)</title>", resp.text, re.IGNORECASE | re.DOTALL)
    return SourceDoc.from_content(
        uri=url, markdown=md, kind="html",
        title=unescape(title_m.group(1).strip()) if title_m else None,
        meta={"adapter": "httpx-fallback", "status": resp.status_code},
    )


def _fetch_crawl4ai(url: str) -> SourceDoc:
    import asyncio

    from crawl4ai import AsyncWebCrawler  # type: ignore[import-not-found]

    async def _run() -> SourceDoc:
        async with AsyncWebCrawler() as crawler:
            result = await crawler.arun(url=url)
            md = getattr(result.markdown, "fit_markdown", None) or str(result.markdown or "")
            return SourceDoc.from_content(
                uri=url, markdown=md, kind="html",
                title=(result.metadata or {}).get("title"),
                meta={"adapter": "crawl4ai"},
            )

    return asyncio.run(_run())


def convert_file(path: str | Path) -> SourceDoc:
    """Local file → SourceDoc. PDF via marker → pypdf; everything else read as text."""
    path = Path(path)
    if path.suffix.lower() == ".pdf":
        return _convert_pdf(path)
    text = path.read_text(encoding="utf-8", errors="replace")
    return SourceDoc.from_content(
        uri=path.resolve().as_uri(), markdown=text,
        kind="text", title=path.stem, meta={"adapter": "text"},
    )


def _convert_pdf(path: Path) -> SourceDoc:
    try:
        from marker.converters.pdf import PdfConverter  # type: ignore[import-not-found]
        from marker.models import create_model_dict  # type: ignore[import-not-found]

        converter = PdfConverter(artifact_dict=create_model_dict())
        rendered = converter(str(path))
        return SourceDoc.from_content(
            uri=path.resolve().as_uri(), markdown=rendered.markdown,
            kind="pdf", title=path.stem, meta={"adapter": "marker"},
        )
    except ImportError:
        pass
    try:
        from pypdf import PdfReader  # type: ignore[import-not-found]
    except ImportError as e:
        raise RuntimeError(
            f"PDF ingestion for {path.name} needs pypdf: uv pip install pypdf"
        ) from e
    reader = PdfReader(str(path))
    text = "\n\n".join((page.extract_text() or "") for page in reader.pages)
    return SourceDoc.from_content(
        uri=path.resolve().as_uri(), markdown=text,
        kind="pdf", title=path.stem, meta={"adapter": "pypdf-fallback"},
    )


def ingest(source: str) -> SourceDoc:
    """Route a source string (URL or path) to the right adapter."""
    if re.match(r"^https?://", source):
        return fetch_url(source)
    return convert_file(source)
