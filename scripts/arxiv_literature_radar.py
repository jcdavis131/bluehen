#!/usr/bin/env python3
"""Fetch recent arXiv papers and cross-check against literature_registry.json.

Outputs a digest JSON + markdown summary. Flags papers that may overlap with our
in-flight experiments so Research does not reinvent recently published work.

Usage:
  uv run python scripts/arxiv_literature_radar.py
  uv run python scripts/arxiv_literature_radar.py --days 14 --write-md
"""

from __future__ import annotations

import argparse
import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config" / "arxiv_watch_queries.json"
REGISTRY = ROOT / "config" / "literature_registry.json"
OUT_DIR = ROOT / "data" / "literature"
ATOM_NS = {"atom": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}


def _fetch_atom(query: str, max_results: int) -> str:
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
    req = urllib.request.Request(url, headers={"User-Agent": "BlueHenRE-LiteratureRadar/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8")


def _parse_entries(xml_text: str) -> list[dict]:
    root = ET.fromstring(xml_text)
    entries: list[dict] = []
    for entry in root.findall("atom:entry", ATOM_NS):
        arxiv_id = entry.find("atom:id", ATOM_NS)
        title = entry.find("atom:title", ATOM_NS)
        summary = entry.find("atom:summary", ATOM_NS)
        published = entry.find("atom:published", ATOM_NS)
        authors = [a.find("atom:name", ATOM_NS).text or "" for a in entry.findall("atom:author", ATOM_NS)]
        categories = [c.get("term", "") for c in entry.findall("atom:category", ATOM_NS)]
        link = ""
        for l in entry.findall("atom:link", ATOM_NS):
            if l.get("title") == "pdf":
                link = l.get("href", "")
                break
        raw_id = (arxiv_id.text or "").split("/abs/")[-1] if arxiv_id is not None else ""
        entries.append(
            {
                "arxivId": raw_id.replace("v1", "").split("v")[0],
                "title": " ".join((title.text or "").split()),
                "summary": " ".join((summary.text or "").split())[:600],
                "published": (published.text or "")[:10],
                "authors": authors[:5],
                "categories": categories,
                "pdfUrl": link,
            }
        )
    return entries


def _load_registry() -> dict:
    return json.loads(REGISTRY.read_text(encoding="utf-8"))


def _registry_arxiv_ids(registry: dict) -> set[str]:
    ids: set[str] = set()
    for e in registry.get("entries", []):
        aid = e.get("arxiv")
        if aid:
            ids.add(str(aid).replace("v", "").split("v")[0])
    return ids


def _overlap_score(text: str, keywords: list[str]) -> list[str]:
    lower = text.lower()
    return [k for k in keywords if k.lower() in lower]


def _match_registry(entry: dict, registry: dict) -> list[dict]:
    hits: list[dict] = []
    blob = f"{entry['title']} {entry['summary']}".lower()
    for item in registry.get("entries", []):
        title_words = item.get("title", "").lower().split()
        # Simple token overlap on distinctive title words (>4 chars)
        distinctive = [w for w in title_words if len(w) > 4][:4]
        if distinctive and sum(1 for w in distinctive if w in blob) >= 2:
            hits.append({"registryId": item["id"], "status": item["status"], "title": item["title"]})
    return hits


def run_radar(days: int, max_per_query: int | None) -> dict:
    watch = json.loads(CONFIG.read_text(encoding="utf-8"))
    registry = _load_registry()
    known_ids = _registry_arxiv_ids(registry)
    novelty_kw = watch.get("noveltyKeywords", [])
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
    max_results = max_per_query or watch.get("maxResultsPerQuery", 25)

    all_papers: dict[str, dict] = {}
    by_query: dict[str, list[str]] = {}

    for q in watch.get("queries", []):
        qid = q["id"]
        try:
            xml_text = _fetch_atom(q["searchQuery"], max_results)
            entries = _parse_entries(xml_text)
        except Exception as exc:  # noqa: BLE001 — surface fetch errors in digest
            by_query[qid] = []
            all_papers[f"_error_{qid}"] = {
                "arxivId": "",
                "title": f"Fetch failed: {qid}",
                "summary": str(exc),
                "published": "",
                "authors": [],
                "categories": [],
                "pdfUrl": "",
                "queryIds": [qid],
                "keywordHits": [],
                "registryMatches": [],
                "flags": ["fetch_error"],
            }
            continue

        ids_for_query: list[str] = []
        for e in entries:
            if e["published"] and e["published"] < cutoff:
                continue
            aid = e["arxivId"]
            if not aid:
                continue
            ids_for_query.append(aid)
            flags: list[str] = []
            if aid in known_ids:
                flags.append("already_in_registry")
            kw_hits = _overlap_score(f"{e['title']} {e['summary']}", novelty_kw)
            reg_matches = _match_registry(e, registry)
            if kw_hits and "already_in_registry" not in flags:
                flags.append("topic_overlap")
            if reg_matches:
                flags.append("registry_overlap")

            if aid in all_papers:
                all_papers[aid]["queryIds"].append(qid)
                all_papers[aid]["flags"] = list(set(all_papers[aid]["flags"] + flags))
            else:
                all_papers[aid] = {
                    **e,
                    "queryIds": [qid],
                    "keywordHits": kw_hits,
                    "registryMatches": reg_matches,
                    "flags": flags,
                }
        by_query[qid] = ids_for_query

    papers = [p for k, p in sorted(all_papers.items()) if not k.startswith("_error_")]
    errors = [p for k, p in all_papers.items() if k.startswith("_error_")]
    flagged = [p for p in papers if "topic_overlap" in p["flags"] and "already_in_registry" not in p["flags"]]

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "cutoffDate": cutoff,
        "daysWindow": days,
        "paperCount": len(papers),
        "flaggedCount": len(flagged),
        "byQuery": by_query,
        "flagged": flagged,
        "papers": papers,
        "errors": errors,
        "synthesisTarget": registry.get("synthesisTarget"),
    }


def write_markdown(digest: dict, path: Path) -> None:
    lines = [
        "# Literature radar digest",
        "",
        f"Generated: {digest['generatedAt']} · window: last {digest['daysWindow']} days · "
        f"papers: {digest['paperCount']} · **needs review: {digest['flaggedCount']}**",
        "",
        "## Frontier stack (target architecture)",
        "",
    ]
    synth = digest.get("synthesisTarget") or {}
    lines.append(f"**{synth.get('name', 'N/A')}** — {synth.get('tagline', '')}")
    lines.append("")
    for layer in synth.get("layers", []):
        lines.append(f"- **{layer.get('layer')}:** {layer.get('choice')}")
    lines.append("")
    lines.append("## Flagged for human review (possible overlap — do not reinvent blindly)")
    lines.append("")
    if not digest["flagged"]:
        lines.append("_No new flagged papers in this window._")
    else:
        for p in digest["flagged"]:
            lines.append(f"### [{p['arxivId']}] {p['title']}")
            lines.append(f"- Published: {p['published']} · Queries: {', '.join(p['queryIds'])}")
            lines.append(f"- Keywords: {', '.join(p['keywordHits']) or '—'}")
            if p["registryMatches"]:
                for m in p["registryMatches"]:
                    lines.append(f"- Registry overlap: `{m['registryId']}` ({m['status']}) — {m['title']}")
            lines.append(f"- Abstract: {p['summary'][:400]}…")
            lines.append("")
    lines.append("## All papers fetched")
    lines.append("")
    for p in digest["papers"]:
        flag_str = ", ".join(p["flags"]) if p["flags"] else "new"
        lines.append(f"- `{p['arxivId']}` ({p['published']}) [{flag_str}] {p['title']}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="arXiv literature radar for Research org")
    parser.add_argument("--days", type=int, default=30, help="Only include papers published within N days")
    parser.add_argument("--max-per-query", type=int, default=None)
    parser.add_argument("--write-md", action="store_true", help="Also write markdown digest")
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    digest = run_radar(args.days, args.max_per_query)

    ts = datetime.now(timezone.utc).strftime("%Y%m%d")
    json_path = OUT_DIR / f"radar_{ts}.json"
    json_path.write_text(json.dumps(digest, indent=2), encoding="utf-8")
    latest = OUT_DIR / "radar_latest.json"
    latest.write_text(json.dumps(digest, indent=2), encoding="utf-8")

    print(f"Wrote {json_path} ({digest['paperCount']} papers, {digest['flaggedCount']} flagged)")

    if args.write_md:
        md_path = OUT_DIR / f"radar_{ts}.md"
        write_markdown(digest, md_path)
        (OUT_DIR / "radar_latest.md").write_text(md_path.read_text(encoding="utf-8"), encoding="utf-8")
        print(f"Wrote {md_path}")


if __name__ == "__main__":
    main()
