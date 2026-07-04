"""Wiki Refinery (Spec 0020): deterministic wiki built from catalog rows,
with an optional GLM refinement pass (key-gated, honestly labeled).

Every number is computed from rows at build time; the build timestamp is
printed on every page; model-generated sections are labeled with dates.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.database import db_session
from app.models import CatalogDataset, WikiPage

log = logging.getLogger("synthaembed.wiki")

FOOTER_DETERMINISTIC = (
    "\n\n---\n*Deterministic build only — model refinement pending "
    "(`GLM_API_KEY` unset). Every figure above is computed from catalog "
    "rows at build time.*\n"
)


def _stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def _related(ds: dict, all_ds: list[dict]) -> list[dict]:
    """Deterministic cross-links: shared source, then tag overlap."""
    scored = []
    tags = set(ds["tags"])
    for other in all_ds:
        if other["slug"] == ds["slug"]:
            continue
        score = 0.0
        if ds["source_id"] and other["source_id"] == ds["source_id"]:
            score += 2.0
        overlap = tags & set(other["tags"])
        score += len(overlap)
        if score > 0:
            scored.append((score, other))
    scored.sort(key=lambda t: (-t[0], t[1]["slug"]))
    return [o for _, o in scored[:5]]


def _load_datasets() -> list[dict]:
    with db_session() as session:
        rows = session.scalars(select(CatalogDataset).order_by(CatalogDataset.created_at.desc())).all()
        return [{
            "slug": r.slug, "name": r.name, "docs": r.doc_count,
            "chunks": r.chunk_count, "tags": list(r.tags or []),
            "source_id": r.source_id, "created": r.created_at.strftime("%Y-%m-%d"),
            "card": bool(r.card_md),
        } for r in rows]


def _upsert(session, slug: str, kind: str, title: str, body: str, sources: list[str],
            description: str | None = None) -> bool:
    row = session.scalar(select(WikiPage).where(WikiPage.slug == slug))
    if row is None:
        session.add(WikiPage(id=uuid.uuid4(), slug=slug, kind=kind, title=title,
                             body_md=body, sources=sources, description=description,
                             updated_at=datetime.now(timezone.utc)))
        return True
    if row.body_md.split("\n\n## Model refinement")[0] != body.split("\n\n## Model refinement")[0]:
        # preserve appended refinement sections across deterministic rebuilds
        refinement = ""
        if "\n\n## Model refinement" in row.body_md:
            refinement = "\n\n## Model refinement" + row.body_md.split("\n\n## Model refinement", 1)[1]
            body = body.replace(FOOTER_DETERMINISTIC, "") + refinement
        row.body_md = body
        row.title = title
        row.sources = sources
        row.description = description
        row.updated_at = datetime.now(timezone.utc)
        return True
    return False


def rebuild_wiki() -> dict:
    """Idempotent full rebuild of the deterministic wiki from catalog rows."""
    ds = _load_datasets()
    stamp = _stamp()
    changed = 0

    with db_session() as session:
        # index page
        by_source: dict[str, int] = {}
        for d in ds:
            key = d["source_id"] or "(manual)"
            by_source[key] = by_source.get(key, 0) + 1
        body = [
            f"# Dataset catalog — the refinery's index\n",
            f"*Built {stamp} from {len(ds)} catalog rows.*\n",
            f"\n| Dataset | Docs | Chunks | Created |\n|---|---|---|---|",
        ]
        for d in ds[:50]:
            body.append(f"| [{d['name']}](/datasets/{d['slug']}) | {d['docs']} | {d['chunks']} | {d['created']} |")
        body.append("\n## By source\n")
        for src, n in sorted(by_source.items(), key=lambda t: -t[1]):
            body.append(f"- `{src}` — {n} dataset{'s' if n != 1 else ''}")
        changed += _upsert(session, "index", "index", "Dataset catalog index",
                           "\n".join(body) + FOOTER_DETERMINISTIC, [d["slug"] for d in ds],
                           description=f"Auto-built index of {len(ds)} provenance-carrying datasets "
                                       f"({sum(x['chunks'] for x in ds)} retrieval-ready chunks) in the "
                                       f"Blue Hen RE Data Refinery catalog.")

        # topic pages (per tag)
        tags: dict[str, list[dict]] = {}
        for d in ds:
            for t in d["tags"]:
                tags.setdefault(t, []).append(d)
        for tag, members in tags.items():
            body = [
                f"# Topic: {tag}\n",
                f"*Built {stamp} — {len(members)} dataset(s) carry this tag.*\n",
            ]
            for d in members:
                body.append(f"- [{d['name']}](/datasets/{d['slug']}) — {d['docs']} docs · {d['chunks']} chunks")
            changed += _upsert(session, f"topic-{tag}", "topic", f"Topic: {tag}",
                               "\n".join(body) + FOOTER_DETERMINISTIC, [d["slug"] for d in members],
                               description=f"{len(members)} dataset(s) tagged '{tag}' in the Data Refinery "
                                           f"catalog with provenance, chunk counts, and cross-links.")

        # per-dataset wiki pages with computed cross-links
        for d in ds:
            rel = _related(d, ds)
            body = [
                f"# {d['name']}\n",
                f"*Built {stamp}.* {d['docs']} docs · {d['chunks']} chunks · created {d['created']}."
                + (" OKF card on record." if d["card"] else " No OKF card yet — regenerate via harvest."),
            ]
            if d["tags"]:
                body.append("\nTags: " + " · ".join(f"[{t}](/wiki/topic-{t})" for t in d["tags"]))
            if rel:
                body.append("\n## Related datasets (computed)\n")
                for o in rel:
                    why = "same source" if o["source_id"] == d["source_id"] and d["source_id"] else "shared tags"
                    body.append(f"- [{o['name']}](/datasets/{o['slug']}) — {why}")
            changed += _upsert(session, f"dataset-{d['slug']}", "dataset", d["name"],
                               "\n".join(body) + FOOTER_DETERMINISTIC,
                               [d["slug"]] + [o["slug"] for o in rel],
                               description=f"{d['name']}: {d['docs']} docs, {d['chunks']} chunks, "
                                           f"created {d['created']} — provenance and related datasets.")

        # link map
        edges = []
        for d in ds:
            for o in _related(d, ds):
                if d["slug"] < o["slug"]:
                    edges.append((d, o))
        body = [
            f"# Cross-link map\n",
            f"*Built {stamp} — {len(edges)} computed edges across {len(ds)} datasets.*\n",
        ]
        for a, b in edges:
            body.append(f"- [{a['name']}](/datasets/{a['slug']}) ↔ [{b['name']}](/datasets/{b['slug']})")
        changed += _upsert(session, "link-map", "link-map", "Cross-link map",
                           "\n".join(body) + FOOTER_DETERMINISTIC,
                           [d["slug"] for d in ds],
                           description=f"Computed cross-link map across {len(ds)} catalog datasets, "
                                       f"rebuilt after every harvest.")

    out = {"pages_changed": changed, "datasets": len(ds), "topics": len(tags), "builtAt": stamp}
    log.info("wiki rebuild: %s", out)
    try:
        refined = refine_changed_pages()
        out["refined"] = refined
    except Exception as exc:
        out["refined"] = f"skipped: {exc}"
    return out


def refine_changed_pages(limit: int = 4) -> int:
    """GLM refinement pass (Spec 0020 DR-109): abstractive summary appended
    under a dated heading. No key -> LLMUnavailable -> caller records skip."""
    from agentkit.llm import GLMClient, LLMUnavailable

    client = GLMClient()
    if not client.configured:
        raise LLMUnavailable("GLM_API_KEY not set — deterministic build only")

    refined = 0
    with db_session() as session:
        rows = session.scalars(
            select(WikiPage).where(WikiPage.kind.in_(["index", "topic"]))
            .order_by(WikiPage.updated_at.desc()).limit(limit)
        ).all()
        for row in rows:
            if f"## Model refinement — {datetime.now(timezone.utc).strftime('%Y-%m-%d')}" in row.body_md:
                continue  # already refined today
            result = client.chat([
                {"role": "system", "content":
                 "You refine dataset-wiki pages for an enterprise data catalog. "
                 "Write 3-5 sentences of measured, evidence-grounded synthesis of the page content. "
                 "Never invent numbers; only restate or contextualize what the page states."},
                {"role": "user", "content": row.body_md[:6000]},
            ])
            text = (result.content or "").strip()
            if not text:
                continue
            stamp_day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            section = (f"\n\n## Model refinement — {stamp_day}\n\n"
                       f"*Generated by {client.model} — labeled model output, not a measurement.*\n\n{text}\n")
            row.body_md = row.body_md.replace(FOOTER_DETERMINISTIC, "") + section
            row.generated_by = "glm"
            row.updated_at = datetime.now(timezone.utc)
            refined += 1
    return refined


def list_pages() -> dict:
    with db_session() as session:
        rows = session.scalars(select(WikiPage).order_by(WikiPage.kind, WikiPage.slug)).all()
        return {"pages": [{
            "slug": r.slug, "kind": r.kind, "title": r.title,
            "description": r.description,
            "generatedBy": r.generated_by, "updatedAt": r.updated_at.isoformat(),
        } for r in rows]}


def get_page(slug: str) -> dict | None:
    with db_session() as session:
        row = session.scalar(select(WikiPage).where(WikiPage.slug == slug))
        if row is None:
            return None
        return {"slug": row.slug, "kind": row.kind, "title": row.title,
                "description": row.description,
                "bodyMd": row.body_md, "generatedBy": row.generated_by,
                "updatedAt": row.updated_at.isoformat()}
