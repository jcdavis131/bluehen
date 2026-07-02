"""Open Knowledge Format (OKF v0.1) writer.

Emits concept documents (markdown + YAML frontmatter), maintains
``index.md`` directory listings, and appends to ``log.md`` — per the OKF
spec (knowledge/ is the platform's bundle root). Kept dependency-free:
frontmatter is emitted with a small serializer rather than a YAML lib.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

RESERVED = {"index.md", "log.md"}


def _yaml_value(v: Any) -> str:
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, list):
        return "[" + ", ".join(_yaml_value(x) for x in v) + "]"
    s = str(v)
    if re.search(r"[:#\[\]{}\"'\n]|^\s|\s$", s):
        return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'
    return s


def frontmatter(fields: dict[str, Any]) -> str:
    lines = ["---"]
    for k, v in fields.items():
        if v is None:
            continue
        lines.append(f"{k}: {_yaml_value(v)}")
    lines.append("---")
    return "\n".join(lines)


class Bundle:
    """A writable OKF bundle rooted at a directory."""

    def __init__(self, root: str | Path) -> None:
        self.root = Path(root)

    def concept_path(self, concept_id: str) -> Path:
        rel = concept_id.strip("/")
        if not rel.endswith(".md"):
            rel += ".md"
        if Path(rel).name in RESERVED:
            raise ValueError(f"reserved filename: {rel}")
        path = (self.root / rel).resolve()
        if self.root.resolve() not in path.parents:
            raise ValueError(f"concept escapes bundle: {concept_id}")
        return path

    def write_concept(
        self,
        concept_id: str,
        *,
        type: str,
        body: str,
        title: str | None = None,
        description: str | None = None,
        resource: str | None = None,
        tags: list[str] | None = None,
        extra: dict[str, Any] | None = None,
    ) -> Path:
        path = self.concept_path(concept_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        fields: dict[str, Any] = {
            "type": type,
            "title": title,
            "description": description,
            "resource": resource,
            "tags": tags,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        if extra:
            fields.update(extra)
        path.write_text(frontmatter(fields) + "\n\n" + body.strip() + "\n", encoding="utf-8")
        return path

    def append_log(self, entry: str, kind: str = "Update", scope: str = "") -> None:
        """Append a dated entry to the scope's log.md (newest-day-first layout)."""
        log_path = self.root / scope / "log.md"
        log_path.parent.mkdir(parents=True, exist_ok=True)
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        line = f"* **{kind}**: {entry}"
        if not log_path.exists():
            log_path.write_text(f"# Update Log\n\n## {today}\n{line}\n", encoding="utf-8")
            return
        text = log_path.read_text(encoding="utf-8")
        heading = f"## {today}"
        if heading in text:
            text = text.replace(heading, f"{heading}\n{line}", 1)
        else:
            # insert the new day right after the H1
            text = re.sub(r"^(# .*\n)", rf"\1\n{heading}\n{line}\n", text, count=1, flags=re.M)
        log_path.write_text(text, encoding="utf-8")

    def add_index_entry(
        self, scope: str, title: str, href: str, description: str, section: str = "Concepts"
    ) -> None:
        """Idempotently add a bullet to the scope's index.md under a section."""
        index_path = self.root / scope / "index.md"
        index_path.parent.mkdir(parents=True, exist_ok=True)
        entry = f"* [{title}]({href}) - {description}"
        if not index_path.exists():
            index_path.write_text(f"# {section}\n\n{entry}\n", encoding="utf-8")
            return
        text = index_path.read_text(encoding="utf-8")
        if f"]({href})" in text:
            return
        heading = f"# {section}"
        if heading in text:
            text = text.replace(heading, f"{heading}\n\n{entry}", 1)
            text = re.sub(r"\n{3,}", "\n\n", text)
        else:
            text = text.rstrip() + f"\n\n{heading}\n\n{entry}\n"
        index_path.write_text(text, encoding="utf-8")
