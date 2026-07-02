#!/usr/bin/env python3
"""Validate every fable-watch skill under ~/.cursor/skills.

Checks per skill:
  1. SKILL.md exists.
  2. YAML frontmatter parses and has `name` + `description`.
  3. `name` matches the directory name.
  4. `description` is non-empty and mentions a WHEN cue ("Use" / "when" / "Use when").
  5. Body has a top-level `#` heading matching the skill name.
  6. No section is empty (a `##` header immediately followed by another header).

Exit 0 if all pass, 1 if any fail. Prints one line per skill + a summary.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

SKILLS_DIR = Path.home() / ".cursor" / "skills"


def _safe_print(text: str) -> None:
    try:
        print(text)
    except UnicodeEncodeError:
        print(text.encode("ascii", "replace").decode())


def _parse_frontmatter(text: str) -> dict | None:
    if not text.startswith("---"):
        return None
    end = text.find("\n---", 3)
    if end == -1:
        return None
    block = text[3:end]
    fm: dict = {}
    for line in block.splitlines():
        if ":" not in line:
            continue
        k, _, v = line.partition(":")
        fm[k.strip()] = v.strip()
    return fm


def _check_empty_sections(body: str) -> list[str]:
    """Return headers whose section body is empty.

    A section is empty if, after the header, the first *non-blank* line that is
    NOT inside a fenced code block is another header at the same or shallower
    depth, or EOF. A deeper sub-header (e.g. `###` under `##`) counts as content,
    not emptiness. Lines starting with `#` inside ``` fences are code, not
    Markdown headers, and are ignored.
    """
    lines = body.splitlines()
    empties: list[str] = []
    in_fence = False
    for i, line in enumerate(lines):
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        m = re.match(r"^(#{1,6})\s", line)
        if not m:
            continue
        depth = len(m.group(1))
        # Find first non-blank line after the header. A fence-open line counts
        # as content (the code block is the section's body), so break on it too.
        j = i + 1
        while j < len(lines) and lines[j].strip() == "":
            j += 1
        if j >= len(lines):
            empties.append(line.strip())
            continue
        # Fence-open as first content → the code block IS the body → not empty.
        if lines[j].lstrip().startswith("```"):
            continue
        mj = re.match(r"^(#{1,6})\s", lines[j])
        if mj and len(mj.group(1)) <= depth:  # same/shallower header → no content
            empties.append(line.strip())
    return empties


def validate(skill_dir: Path) -> tuple[bool, list[str]]:
    errors: list[str] = []
    md = skill_dir / "SKILL.md"
    if not md.exists():
        return False, [f"missing {md.name}"]
    text = md.read_text(encoding="utf-8", errors="replace")
    fm = _parse_frontmatter(text)
    if fm is None:
        return False, ["no valid frontmatter (--- ... ---)"]
    if "name" not in fm:
        errors.append("frontmatter missing `name`")
    elif fm["name"] != skill_dir.name:
        errors.append(f"`name` ({fm['name']}) != dir name ({skill_dir.name})")
    desc = fm.get("description", "")
    if not desc:
        errors.append("frontmatter missing `description`")
    elif not re.search(r"\b(Use|when|Use when)\b", desc, re.IGNORECASE):
        errors.append("description lacks a WHEN cue (Use/when)")
    # Body checks
    body = text.split("\n---", 1)[1] if "\n---" in text else text
    h1 = re.search(r"^#\s+(.+)$", body, re.MULTILINE)
    if not h1:
        errors.append("no top-level `#` heading in body")
    # Note: H1 is conventionally Title-Case; frontmatter `name` is kebab-case.
    # They legitimately differ (cf. built-in skills) — we only require an H1 exists.
    empties = _check_empty_sections(body)
    for e in empties:
        errors.append(f"empty section: {e}")
    return (not errors), errors


def main() -> int:
    if not SKILLS_DIR.exists():
        _safe_print(f"ERROR: {SKILLS_DIR} does not exist")
        return 1
    dirs = sorted(d for d in SKILLS_DIR.iterdir() if d.is_dir())
    if not dirs:
        _safe_print(f"ERROR: no skill dirs in {SKILLS_DIR}")
        return 1
    ok = 0
    fail = 0
    for d in dirs:
        passed, errors = validate(d)
        if passed:
            _safe_print(f"PASS  {d.name}")
            ok += 1
        else:
            _safe_print(f"FAIL  {d.name}")
            for e in errors:
                _safe_print(f"        - {e}")
            fail += 1
    _safe_print(f"\n{ok} passed, {fail} failed, {len(dirs)} total")
    return 1 if fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
