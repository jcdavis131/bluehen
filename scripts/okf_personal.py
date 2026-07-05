"""The personal Agent OS curator (OKF): radar papers -> Open Knowledge
Format markdown notes -> embedding-space map for jcamd.com.

- Notes live in knowledge/personal/ as OKF markdown (frontmatter:
  title/tags/source/added; body w/ [[concept]] wiki-links). Vendor-
  neutral; humans and agents edit the same files.
- The map: every note's text embedded with the real MiniLM backbone
  (local, free), PCA to 2D -> knowledge/personal/graph.json. Distance
  on the map IS embedding distance — no force-layout fiction.

Run:  packages/asn-engine/.venv/Scripts/python.exe scripts/okf_personal.py
Idempotent; re-run after adding/editing notes to refresh the map.
"""

from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "packages" / "asn-engine"))
KB = REPO / "knowledge" / "personal"
RADAR = REPO / "data" / "literature" / "radar_latest.json"

LEVERS = {
    "loss": (["infonce", "barlow", "vicreg", "mrl", "matryoshka", "contrastive"],
             "contrastive-objectives"),
    "chunk": (["chunking", "retrieval", "rag"], "retrieval-and-rag"),
    "head": (["projection", "adapter", "lora", "multi-task", "mtnn"],
             "adapters-and-heads"),
    "pairs": (["negative", "mining", "triplet"], "hard-negatives"),
    "graph": (["graph", "embedding space", "latent"], "embedding-spaces"),
}
CONCEPTS = {
    "contrastive-objectives": "Contrastive objectives",
    "retrieval-and-rag": "Retrieval & RAG",
    "adapters-and-heads": "Adapters, heads & MTNN",
    "hard-negatives": "Hard negatives",
    "embedding-spaces": "Embedding spaces",
    "mtnn-omni-embedding": "The MTNN omni-embedding thesis",
}


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:64]


def write_note(path: Path, title: str, tags: list[str], source: str,
               body: str) -> None:
    if path.exists():  # curated files are never clobbered
        return
    fm = ("---\n"
          f"title: \"{title}\"\n"
          f"tags: [{', '.join(tags)}]\n"
          f"source: \"{source}\"\n"
          f"added: {date.today().isoformat()}\n"
          "format: okf/v0\n"
          "---\n\n")
    path.write_text(fm + body + "\n", encoding="utf-8")


def seed_concepts() -> None:
    (KB / "concepts").mkdir(parents=True, exist_ok=True)
    blurbs = {
        "contrastive-objectives": "How embedding models learn what belongs together: InfoNCE, Barlow Twins, VICReg, Matryoshka. Our measured results: Barlow adapts in-domain while IMPROVING out-of-domain (EVIDENCE 3.16); no objective separates beyond seed noise on pool-16 (3.15).",
        "retrieval-and-rag": "Retrieval as a product surface and as agent context. The Qodo lesson: context-assembly RAG loses to tool-using agents; ranking at product latency does not.",
        "adapters-and-heads": "Small trained heads on a shared frozen backbone — the multi-tower/MTNN pattern. 3MB per tenant, panel-beating in-domain. The omni-embedding roadmap grows towers per data type.",
        "hard-negatives": "The data class money can't buy. Mined adversarially by humans in Beat the Baseline; jaccard-hard negatives in the pair builder (RAG-503).",
        "embedding-spaces": "Geometry of learned representations: effective rank, collapse, cross-domain transfer. This map itself is one — positions are real MiniLM embeddings, PCA-projected.",
        "mtnn-omni-embedding": "One shared backbone, many task heads fed by the studio games: triplets (dumbmodel), edges (arxiviq), rankings (slasso), temporal (signals). Heads get written only when their game has fed them (Spec 0031).",
    }
    for slug, blurb in blurbs.items():
        write_note(KB / "concepts" / f"{slug}.md", CONCEPTS[slug],
                   ["concept"], "curated", blurb)


def seed_papers() -> int:
    (KB / "papers").mkdir(parents=True, exist_ok=True)
    if not RADAR.exists():
        print("no radar output — papers skipped (honest empty)")
        return 0
    data = json.loads(RADAR.read_text(encoding="utf-8"))
    papers = data.get("papers") or data.get("entries") or []
    n = 0
    for p in papers:
        title = (p.get("title") or "").strip().replace("\n", " ")
        summary = (p.get("summary") or p.get("abstract") or "").strip()
        link = p.get("link") or p.get("url") or ""
        blob = (title + " " + summary).lower()
        tags, links = [], []
        for lever, (kws, concept) in LEVERS.items():
            if any(k in blob for k in kws):
                tags.append(lever)
                links.append(concept)
        if not tags:
            continue
        body = (summary[:600] + ("…" if len(summary) > 600 else "")
                + "\n\nRelated: " + " ".join(f"[[{c}]]" for c in dict.fromkeys(links)))
        write_note(KB / "papers" / f"{slugify(title)}.md", title,
                   sorted(set(tags)), link, body)
        n += 1
    return n


def build_graph() -> dict:
    sys.path.insert(0, str(REPO / "scripts"))
    from realtext_validation import encode_texts  # local backbone, free

    notes = []
    for path in sorted(KB.rglob("*.md")):
        text = path.read_text(encoding="utf-8")
        m = re.search(r'title: "(.*?)"', text)
        tags = re.search(r"tags: \[(.*?)\]", text)
        src = re.search(r'source: "(.*?)"', text)
        body = text.split("---", 2)[-1].strip()
        notes.append({
            "slug": path.stem,
            "kind": path.parent.name,
            "title": m.group(1) if m else path.stem,
            "tags": [t.strip() for t in tags.group(1).split(",")] if tags else [],
            "source": src.group(1) if src else "",
            "text": (notes and body or body)[:800],
            "links": re.findall(r"\[\[(.+?)\]\]", body),
        })
    if not notes:
        return {"nodes": [], "edges": []}

    vecs = encode_texts("sentence-transformers/all-MiniLM-L6-v2",
                        [n["title"] + ". " + n["text"] for n in notes])
    import numpy as np

    X = np.asarray(vecs, dtype=float)
    X = X - X.mean(axis=0)
    U, S, _ = np.linalg.svd(X, full_matrices=False)
    coords = U[:, :2] * S[:2]
    span = max(coords.max(0) - coords.min(0)) or 1.0
    coords = (coords - coords.min(0)) / span

    slugs = {n["slug"] for n in notes}
    edges = []
    for n, (x, y) in zip(notes, coords):
        n["x"], n["y"] = round(float(x), 4), round(float(y), 4)
        for target in n.pop("links"):
            if target in slugs and target != n["slug"]:
                edges.append([n["slug"], target])
        n.pop("text")
    return {"generated": date.today().isoformat(),
            "model": "all-MiniLM-L6-v2 + PCA(2)",
            "nodes": notes, "edges": edges}


if __name__ == "__main__":
    KB.mkdir(parents=True, exist_ok=True)
    seed_concepts()
    n = seed_papers()
    graph = build_graph()
    (KB / "graph.json").write_text(json.dumps(graph, indent=1), encoding="utf-8")
    print(f"OKF personal KB: +{n} paper notes, {len(graph['nodes'])} nodes, "
          f"{len(graph['edges'])} link edges -> knowledge/personal/graph.json")
