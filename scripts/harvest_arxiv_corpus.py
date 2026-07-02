#!/usr/bin/env python3
"""Harvest arXiv abstracts into the research corpus for the Applied Research org.

Builds data/corpora/research/corpus.jsonl from CS.CL / embedding-related queries.
Each line: {"id", "title", "text", "source", "arxivId", "published"}.

The downstream data pipeline (services/core-api/app/services/data.py) chunks each
doc on blank-line paragraph boundaries. arXiv abstracts are single paragraphs, so
one doc -> one chunk. To reach the >=500-chunk training floor without downloading
full PDFs (disk-heavy), we scale the abstract harvest across all watch queries
with paging until --min-papers is met or the arXiv API is exhausted.

Usage:
  uv run python scripts/harvest_arxiv_corpus.py
  uv run python scripts/harvest_arxiv_corpus.py --max-papers 600 --min-papers 500 --merge
  pnpm harvest:arxiv && pnpm kickoff:orgs  # after stack is up
"""

from __future__ import annotations

import argparse
import json
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WATCH = ROOT / "config" / "arxiv_watch_queries.json"
CORPUS_DIR = ROOT / "data" / "corpora" / "research"
CORPUS_PATH = CORPUS_DIR / "corpus.jsonl"
META_PATH = CORPUS_DIR / "meta.json"
ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}

# arXiv API asks for polite client behavior; 3s between paged requests.
_PAGE_SIZE = 100
_PAGE_DELAY_S = 3.0
_MAX_PAGES_PER_QUERY = 10


def _fetch_page(query: str, start: int, max_results: int) -> tuple[list[dict], int]:
    """Fetch one arXiv API page. Returns (docs, total_results_estimate)."""
    params = urllib.parse.urlencode(
        {
            "search_query": query,
            "start": start,
            "max_results": max_results,
            "sortBy": "submittedDate",
            "sortOrder": "descending",
        }
    )
    url = f"http://export.arxiv.org/api/query?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": "BlueHenRE-Harvester/1.0 (research)"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        root = ET.fromstring(resp.read().decode("utf-8"))

    total_el = root.find("atom:totalResults", ATOM_NS)
    total = int(total_el.text) if total_el is not None and total_el.text else 0

    docs: list[dict] = []
    for entry in root.findall("atom:entry", ATOM_NS):
        arxiv_id = entry.find("atom:id", ATOM_NS)
        title_el = entry.find("atom:title", ATOM_NS)
        summary_el = entry.find("atom:summary", ATOM_NS)
        published_el = entry.find("atom:published", ATOM_NS)
        raw_id = (arxiv_id.text or "").split("/abs/")[-1] if arxiv_id is not None else ""
        aid = raw_id.split("v")[0]
        title = " ".join((title_el.text or "").split())
        abstract = " ".join((summary_el.text or "").split())
        published = (published_el.text or "")[:10]
        if not aid or not abstract:
            continue
        docs.append(
            {
                "id": f"arxiv:{aid}",
                "title": title,
                "text": abstract,
                "source": f"https://arxiv.org/abs/{aid}",
                "arxivId": aid,
                "published": published,
            }
        )
    return docs, total


def _fetch_query(query: str, want: int) -> list[dict]:
    """Page through one query until `want` docs collected or query exhausted."""
    out: list[dict] = []
    pages = 0
    start = 0
    while start < want and pages < _MAX_PAGES_PER_QUERY:
        try:
            docs, total = _fetch_page(query, start, _PAGE_SIZE)
        except (urllib.error.URLError, TimeoutError, ET.ParseError) as exc:
            print(f"WARN page {start} failed: {exc}")
            break
        if not docs:
            break
        out.extend(docs)
        pages += 1
        # Stop early if we've consumed everything arXiv has for this query.
        if total and start + len(docs) >= total:
            break
        start += _PAGE_SIZE
        if start < want:
            time.sleep(_PAGE_DELAY_S)
    return out


def _dedupe_by_id(docs: list[dict]) -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []
    for d in docs:
        key = d.get("id") or d.get("arxivId", "")
        if key in seen:
            continue
        seen.add(key)
        out.append(d)
    return out


def harvest(
    max_papers: int,
    merge: bool,
    *,
    min_papers: int = 0,
    query_ids: list[str] | None = None,
) -> dict:
    watch = json.loads(WATCH.read_text(encoding="utf-8"))
    all_queries = watch.get("queries", [])
    if query_ids is None:
        # Use every watch query (radar "watch-only" ones still broaden corpus relevance).
        query_ids = [q["id"] for q in all_queries]
    queries = [q for q in all_queries if q["id"] in query_ids]
    if not queries:
        raise ValueError(f"no matching queries in {WATCH}: {query_ids}")

    per_query = max(20, max_papers // len(queries))

    collected: list[dict] = []
    for q in queries:
        try:
            got = _fetch_query(q["searchQuery"], per_query)
            print(f"  {q['id']}: {len(got)} docs")
            collected.extend(got)
        except Exception as exc:  # noqa: BLE001
            print(f"WARN fetch failed for {q['id']}: {exc}")

    collected = _dedupe_by_id(collected)

    if merge and CORPUS_PATH.exists():
        existing: list[dict] = []
        with CORPUS_PATH.open(encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    existing.append(json.loads(line))
        collected = _dedupe_by_id(existing + collected)

    if min_papers and len(collected) < min_papers:
        print(f"WARN only {len(collected)} unique papers (< min {min_papers}); corpus may be thin.")
    collected = collected[:max_papers]

    CORPUS_DIR.mkdir(parents=True, exist_ok=True)
    with CORPUS_PATH.open("w", encoding="utf-8") as f:
        for doc in collected:
            f.write(json.dumps(doc, ensure_ascii=False) + "\n")

    META_PATH.write_text(
        json.dumps(
            {
                "siteId": "research",
                "docCount": len(collected),
                "source": "arxiv_harvest",
                "queries": query_ids,
                "minPapers": min_papers,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    return {
        "path": str(CORPUS_PATH),
        "docCount": len(collected),
        "queries": query_ids,
        "metMin": (not min_papers) or len(collected) >= min_papers,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Harvest arXiv abstracts for the research corpus")
    parser.add_argument("--max-papers", type=int, default=600, help="Upper bound on papers to keep (default 600)")
    parser.add_argument("--min-papers", type=int, default=500, help="Warn if fewer unique papers (default 500)")
    parser.add_argument("--merge", action="store_true", help="Merge with existing corpus.jsonl")
    parser.add_argument(
        "--queries",
        help="Comma-separated query ids to use (default: all in arxiv_watch_queries.json)",
    )
    args = parser.parse_args()
    query_ids = args.queries.split(",") if args.queries else None
    result = harvest(
        args.max_papers,
        args.merge,
        min_papers=args.min_papers,
        query_ids=query_ids,
    )
    print(f"Wrote {result['path']} ({result['docCount']} docs, metMin={result['metMin']})")


if __name__ == "__main__":
    main()
