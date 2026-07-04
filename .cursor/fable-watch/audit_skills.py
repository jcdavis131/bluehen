#!/usr/bin/env python3
"""Audit ~/.cursor/skills against skill-review-checklist.md.

Prints per-skill scorecard: line count, description length, third-person check,
reference file presence, Windows paths, first/second person in description.

Exit 0 always (informational). Pair with validate_skills.py for hard gates.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

SKILLS_DIR = Path.home() / ".cursor" / "skills"
BODY_LINE_SOFT = 120
BODY_CHAR_SOFT = 4500


def _parse_frontmatter(text: str) -> tuple[dict, str]:
    if not text.startswith("---"):
        return {}, text
    end = text.find("\n---", 3)
    if end == -1:
        return {}, text
    block = text[3:end]
    fm: dict = {}
    for line in block.splitlines():
        if ":" not in line:
            continue
        k, _, v = line.partition(":")
        fm[k.strip()] = v.strip()
    body = text[end + 4 :].lstrip("\n")
    return fm, body


def audit(skill_dir: Path) -> dict:
    md = skill_dir / "SKILL.md"
    text = md.read_text(encoding="utf-8", errors="replace")
    fm, body = _parse_frontmatter(text)
    desc = fm.get("description", "")
    name = fm.get("name", skill_dir.name)
    body_lines = len(body.splitlines())
    issues: list[str] = []
    if fm.get("name") != skill_dir.name:
        issues.append("name!=dir")
    if not desc:
        issues.append("no-description")
    if len(desc) > 1024:
        issues.append(f"desc>{1024}chars")
    if re.search(r"\b(I can|You can|you can|I will|you should)\b", desc):
        issues.append("desc-first/second-person")
    if not re.search(r"\b(Use when|Use at|Use whenever|Use to|Use after|Use before|Use during|Use on)\b", desc, re.I):
        issues.append("desc-missing-WHEN")
    if body_lines > 500:
        issues.append("body>500-lines")
    if body_lines > BODY_LINE_SOFT:
        issues.append(f"body>{BODY_LINE_SOFT}-lines-soft")
    if len(body) > BODY_CHAR_SOFT:
        issues.append(f"body>{BODY_CHAR_SOFT}-chars-soft")
    if re.search(r'(?:^|[\s/])[A-Za-z]:\\|apps\\sites', body):
        issues.append("windows-path-in-body")
    if re.search(r"\b20(2[0-9]|3[0-9])\b", body) and "old patterns" not in body.lower():
        issues.append("possible-time-sensitive")
    ref = skill_dir / "reference.md"
    has_ref = ref.exists()
    if body_lines > BODY_LINE_SOFT and not has_ref:
        issues.append("needs-reference-split")
    return {
        "name": name,
        "desc_len": len(desc),
        "body_lines": body_lines,
        "body_chars": len(body),
        "has_ref": has_ref,
        "issues": issues,
    }


def main() -> int:
    if not SKILLS_DIR.exists():
        print(f"ERROR: {SKILLS_DIR} missing", file=sys.stderr)
        return 1
    dirs = sorted(d for d in SKILLS_DIR.iterdir() if d.is_dir())
    need_opt = 0
    clean = 0
    print(f"{'skill':<32} {'lines':>5} {'chars':>6} {'ref':>3}  issues")
    print("-" * 72)
    for d in dirs:
        if not (d / "SKILL.md").exists():
            continue
        r = audit(d)
        ref = "Y" if r["has_ref"] else "-"
        iss = ", ".join(r["issues"]) if r["issues"] else "ok"
        flag = "!" if r["issues"] else " "
        print(
            f"{r['name']:<32} {r['body_lines']:>5} {r['body_chars']:>6} {ref:>3}{flag} {iss}"
        )
        if r["issues"]:
            need_opt += 1
        else:
            clean += 1
    print("-" * 72)
    print(f"{clean} clean, {need_opt} need optimization, {len(dirs)} total")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
