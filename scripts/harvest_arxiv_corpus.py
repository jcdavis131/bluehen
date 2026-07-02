#!/usr/bin/env python3
"""Harvest arXiv abstracts into research-rag corpus for Data org.

Builds data/corpora/research-rag/corpus.jsonl from CS.CL / embedding-related queries.
Each line: {"id", "title", "text", "source", "arxivId", "published"}.

Usage:
  uv run python scripts/harvest_arxiv_corpus.py
  uv run python scripts/harvest_arxiv_corpus.py --max-papers 100 --merge
  pnpm harvest:arxiv && pnpm kickoff:orgs  # after stack is up
"""

from __future__ import annotations

import argparse
import json
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WATCH = ROOT / "config" / "arxiv_watch_queries.json"
CORPUS_DIR = ROOT / "data" / "corpora" / "research-rag"
CORPUS_PATH = CORPUS_DIR / "corpus.jsonl"
ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}


def _fetch(query: str, max_results: int) -> list[dict]:
    params = urllib.parse.urlencode(
        {
            "search_query": query,
            "start": 0,
            "max_results": max_results,
            "sortBy": "submittedDate",
            "sortOrder": "descending",
        }
    )
    url = f"http://export.arxiv.org/api/query?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": "BlueHenRE-Harvester/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        root = ET.fromstring(resp.read().decode("utf-8"))

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
    return docs


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


def harvest(max_papers: int, merge: bool) -> dict:
    watch = json.loads(WATCH.read_text(encoding="utf-8"))
    query_ids = ["rag_retrieval", "embedding_collapse", "matryoshka_edge", "small_embedding"]
    queries = [q for q in watch.get("queries", []) if q["id"] in query_ids]
    per_query = max(10, max_papers // max(len(queries), 1))

    collected: list[dict] = []
    for q in queries:
        try:
            collected.extend(_fetch(q["searchQuery"], per_query))
        except Exception as exc:  # noqa: BLE001
            print(f"WARN fetch failed for {q['id']}: {exc}")

    collected = _dedupe_by_id(collected)[:max_papers]

    if merge and CORPUS_PATH.exists():
        existing: list[dict] = []
        with CORPUS_PATH.open(encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    existing.append(json.loads(line))
        collected = _dedupe_by_id(existing + collected)

    CORPUS_DIR.mkdir(parents=True, exist_ok=True)
    with CORPUS_PATH.open("w", encoding="utf-8") as f:
        for doc in collected:
            f.write(json.dumps(doc, ensure_ascii=False) + "\n")

    meta_path = CORPUS_DIR / "meta.json"
    meta_path.write_text(
        json.dumps(
            {
                "siteId": "research-rag",
                "docCount": len(collected),
                "source": "arxiv_harvest",
                "queries": query_ids,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    return {"path": str(CORPUS_PATH), "docCount": len(collected), "queries": query_ids}


def main() -> None:
    parser = argparse.ArgumentParser(description="Harvest arXiv abstracts for research-rag")
    parser.add_argument("--max-papers", type=int, default=80)
    parser.add_argument("--merge", action="store_true", help="Merge with existing corpus.jsonl")
    args = parser.parse_args()
    result = harvest(args.max_papers, args.merge)
    print(f"Wrote {result['path']} ({result['docCount']} docs)")


if __name__ == "__main__":
    main()
