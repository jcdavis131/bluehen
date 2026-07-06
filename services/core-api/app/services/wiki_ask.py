"""/v1/wiki/ask — the wiki as memory, not chunk-RAG. The answerer
starts at the knowledge graph, walks link edges from the best-matching
nodes (bounded hops), reads those PAGES, and composes a cited answer.

Trust rules mirror WIKI-101: free-tier model allow-list; the model
sees only walked pages; citations verified against the walked set;
the walk itself is returned so the answer is auditable.
"""

from __future__ import annotations

import json
import re
import time
import urllib.request

RAW = "https://raw.githubusercontent.com/jcdavis131/bluehen/main/knowledge/personal/"
FREE_TIER_MODELS = {"llama-3.3-70b-versatile", "llama-3.1-8b-instant"}
MODEL = "llama-3.3-70b-versatile"
assert MODEL in FREE_TIER_MODELS, "free-tier models only"

_cache: dict[str, tuple[float, str]] = {}
_TTL = 900.0


def _fetch(url: str) -> str:
    now = time.time()
    hit = _cache.get(url)
    if hit and now - hit[0] < _TTL:
        return hit[1]
    req = urllib.request.Request(url, headers={"User-Agent": "bluehenre-wiki/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        text = r.read().decode("utf-8", "replace")
    _cache[url] = (now, text)
    return text


def _graph() -> dict:
    return json.loads(_fetch(RAW + "graph.json"))


def _score(node: dict, terms: list[str]) -> int:
    blob = (node.get("title", "") + " " + node.get("summary", "")).lower()
    return sum(blob.count(t) for t in terms)


def ask(query: str, groq_key: str, max_pages: int = 5) -> dict:
    if not query or len(query) > 500:
        raise ValueError("query must be 1-500 chars")
    g = _graph()
    nodes = g.get("nodes", [])
    terms = [t for t in re.findall(r"[a-z0-9-]+", query.lower()) if len(t) > 2]
    ranked = sorted(nodes, key=lambda n: -_score(n, terms))
    seeds = [n for n in ranked[:2] if _score(n, terms) > 0]
    if not seeds:
        return {"answer": None, "pagesWalked": [],
                "note": "no wiki node matches the query — the graph is the "
                        "boundary of what this endpoint knows"}

    # walk: seeds + 1 hop along link edges
    ids = {n["id"] for n in seeds}
    edges = g.get("edges", [])
    for e in edges:
        a, b = e.get("source"), e.get("target")
        for s in list(ids):
            if a == s:
                ids.add(b)
            elif b == s:
                ids.add(a)
    by_id = {n["id"]: n for n in nodes}
    walk = [by_id[i] for i in ids if i in by_id][:max_pages]

    pages = []
    for n in walk:
        kind = n.get("kind", "concepts")
        slug = n.get("slug") or n["id"].split("/")[-1]
        try:
            md = _fetch(f"{RAW}{kind}/{slug}.md")
            pages.append({"id": n["id"], "title": n.get("title", slug),
                          "text": md[:4000]})
        except Exception:
            continue
    if not pages:
        return {"answer": None, "pagesWalked": [],
                "note": "walked nodes had no readable pages"}

    context = "\n\n".join(f"[[{p['title']}]]\n{p['text']}" for p in pages)
    prompt = (
        "Answer the question using ONLY the wiki pages below. Cite pages "
        "inline as [[Page Title]]. If the pages don't answer it, say what "
        "IS covered instead — never invent.\n\nQuestion: " + query +
        "\n\n" + context)
    body = json.dumps({"model": MODEL,
                       "messages": [{"role": "user", "content": prompt}],
                       "temperature": 0.2, "max_tokens": 900}).encode()
    req = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions", data=body,
        headers={"Authorization": f"Bearer {groq_key}",
                 "Content-Type": "application/json",
                 "User-Agent": "bluehenre-wiki/1.0"})
    with urllib.request.urlopen(req, timeout=90) as r:
        answer = json.load(r)["choices"][0]["message"]["content"]

    titles = {p["title"] for p in pages}
    cited = set(re.findall(r"\[\[([^\]]+)\]\]", answer))
    bogus = cited - titles
    if bogus:
        answer += ("\n\n_(citation check: "
                   f"{sorted(bogus)} not in the walked set — treat those "
                   "references as unverified)_")

    return {"answer": answer, "model": MODEL + " (free tier)",
            "pagesWalked": [{"id": p["id"], "title": p["title"]}
                            for p in pages],
            "method": "graph walk (seeds + 1 hop), pages-as-memory, "
                      "citations checked against the walked set"}
