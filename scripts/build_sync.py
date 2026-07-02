#!/usr/bin/env python3
"""B.U.I.L.D. framework sync — raw ingest, inflow pipelines, wiki reflection.

Usage:
  uv run python scripts/build_sync.py upload
  uv run python scripts/build_sync.py inflow-arxiv
  uv run python scripts/build_sync.py inflow-sessions [--limit 20]
  uv run python scripts/build_sync.py reflect [--days 7]
  uv run python scripts/build_sync.py classify --path services/core-api/app/main.py
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "docs" / "raw"
WIKI = ROOT / "docs" / "wiki"
SOURCES = ROOT / "docs" / "sources"
SCHEMAS_SRC = ROOT / "services" / "core-api" / "alembic" / "versions"
AGENTS_CONFIG = ROOT / "config" / "agents.json"
LITERATURE = ROOT / "data" / "literature"
MANIFEST = RAW / "manifest.json"

BUCKET2_PATTERNS = [
    r"services/core-api/app/(routers|routes)/",
    r"alembic/versions/",
    r"apps/synthorg/agent/instructions\.md",
    r"apps/synthorg/agent/subagents/.+/agent\.ts",
    r"config/fleet\.json",
    r"packages/eval-harness/",
    r"scripts/(bootstrap_orgs|kickoff_lifecycle|prod-deploy|railway-deploy|vercel-)",
]

BUCKET3_PATTERNS = [
    r"packages/asn-engine/",
    r"scripts/autoresearch_train\.py",
    r"apps/sites/simulation/",
    r"docs/adr/",
    r"specs/00(10|11)",
    r"WHITEPAPER\.md",
    r"SCIENCE_REVIEW\.md",
]

TASK_ID_RE = re.compile(
    r"\b(?:AR|RT|SITE|RAG|INF|SPEC|DATA|BD|SRV|LOOP)-\d{3}\b"
)
BLOCKER_RE = re.compile(r"\bBLK-[A-Z]+\b")


def _safe_print(text: str) -> None:
    """Print UTF-8 safely on Windows consoles."""
    try:
        print(text)
    except UnicodeEncodeError:
        sys.stdout.buffer.write(text.encode("utf-8", errors="replace") + b"\n")
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def _load_agents_config() -> dict:
    if AGENTS_CONFIG.is_file():
        return json.loads(AGENTS_CONFIG.read_text(encoding="utf-8"))
    return {"agents": {}}


def _expand_path(pattern: str) -> Path:
    expanded = pattern.replace("/", "\\") if sys.platform == "win32" else pattern
    if expanded.startswith("~"):
        expanded = str(Path.home() / expanded[2:].lstrip("/\\"))
    p = Path(expanded)
    return p if p.is_absolute() else ROOT / p


def _glob_sessions(pattern: str) -> list[Path]:
    """Resolve sessionGlob from config/agents.json (supports ~ and **)."""
    base = _expand_path(pattern)
    if any(ch in pattern for ch in ("*", "?", "[")):
        parent = base.parent if base.name else base
        glob_part = base.name or "*"
        if "**" in pattern:
            anchor = _expand_path(pattern.split("**")[0].rstrip("/\\"))
            tail = pattern.split("**", 1)[1].lstrip("/\\")
            return sorted(anchor.rglob(tail or "*"), key=lambda p: p.stat().st_mtime, reverse=True)
        return sorted(parent.glob(glob_part), key=lambda p: p.stat().st_mtime, reverse=True)
    if base.is_dir():
        return sorted(base.rglob("*"), key=lambda p: p.stat().st_mtime, reverse=True)
    if base.is_file():
        return [base]
    return []


def _ensure_raw_dirs() -> None:
    for sub in ("arxiv", "sessions", "exports", "schemas"):
        (RAW / sub).mkdir(parents=True, exist_ok=True)


def _load_manifest() -> dict:
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    return {"version": 1, "uploads": [], "inflows": []}


def _save_manifest(data: dict) -> None:
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    data["updated"] = datetime.now(timezone.utc).isoformat()
    MANIFEST.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def _copy_file(src: Path, dest_dir: Path, prefix: str = "") -> Path | None:
    if not src.is_file():
        return None
    dest_dir.mkdir(parents=True, exist_ok=True)
    name = f"{prefix}{src.name}" if prefix else src.name
    dest = dest_dir / name
    if dest.exists() and dest.stat().st_size == src.stat().st_size:
        return dest
    shutil.copy2(src, dest)
    return dest


def cmd_upload(_: argparse.Namespace) -> int:
    """Bulk ingest historical design docs, schemas, and session snapshots."""
    _ensure_raw_dirs()
    manifest = _load_manifest()
    copied: list[str] = []

    if SOURCES.is_dir():
        exports_dir = RAW / "exports" / "sources"
        for src in sorted(SOURCES.glob("*.md")):
            dest = _copy_file(src, exports_dir, prefix=f"{_ts()}-")
            if dest:
                copied.append(str(dest.relative_to(ROOT)))

    if SCHEMAS_SRC.is_dir():
        schema_dir = RAW / "schemas"
        for src in sorted(SCHEMAS_SRC.glob("*.py")):
            dest = _copy_file(src, schema_dir, prefix=f"{_ts()}-")
            if dest:
                copied.append(str(dest.relative_to(ROOT)))

    manifest["uploads"].append({"at": _ts(), "files": copied})
    _save_manifest(manifest)
    print(f"upload: copied {len(copied)} files -> docs/raw/")
    return 0


def cmd_inflow_arxiv(_: argparse.Namespace) -> int:
    """Run literature radar and mirror output into docs/raw/arxiv/."""
    _ensure_raw_dirs()
    subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "arxiv_literature_radar.py"), "--write-md"],
        cwd=ROOT,
        check=True,
    )
    arxiv_dir = RAW / "arxiv"
    arxiv_dir.mkdir(parents=True, exist_ok=True)
    copied = 0
    if LITERATURE.is_dir():
        for src in LITERATURE.glob("*"):
            if src.suffix in (".json", ".md"):
                if _copy_file(src, arxiv_dir, prefix=f"{_ts()}-"):
                    copied += 1
    manifest = _load_manifest()
    manifest["inflows"].append({"at": _ts(), "type": "arxiv", "files": copied})
    _save_manifest(manifest)
    print(f"inflow-arxiv: mirrored {copied} files -> docs/raw/arxiv/")
    return 0


def cmd_inflow_sessions(args: argparse.Namespace) -> int:
    """Copy recent agent session logs (Cursor, Claude, OpenCode) into docs/raw/sessions/."""
    _ensure_raw_dirs()
    cfg = _load_agents_config()
    agents = cfg.get("agents", {})
    if args.agent != "all":
        if args.agent not in agents:
            print(f"inflow-sessions: unknown agent {args.agent!r}", file=sys.stderr)
            return 1
        agents = {args.agent: agents[args.agent]}

    session_dir = RAW / "sessions"
    limit = args.limit
    copied = 0
    per_agent: dict[str, int] = {}

    for agent_id, meta in agents.items():
        if meta.get("openCodeAgent"):
            continue
        pattern = meta.get("sessionGlob")
        if not pattern:
            continue
        files = [f for f in _glob_sessions(pattern) if f.is_file()]
        count = 0
        for src in files[:limit]:
            dest = session_dir / agent_id
            if _copy_file(src, dest, prefix=f"{_ts()}-"):
                copied += 1
                count += 1
        per_agent[agent_id] = count

    if copied == 0:
        print("inflow-sessions: no session files found (check config/agents.json sessionGlob)", file=sys.stderr)
        return 1

    manifest = _load_manifest()
    manifest["inflows"].append({"at": _ts(), "type": "sessions", "agents": per_agent, "files": copied})
    _save_manifest(manifest)
    summary = ", ".join(f"{k}={v}" for k, v in per_agent.items())
    print(f"inflow-sessions: copied {copied} files -> docs/raw/sessions/ ({summary})")
    return 0


def cmd_context(args: argparse.Namespace) -> int:
    """Emit compact session boot block for any registered agent runtime."""
    cfg = _load_agents_config()
    agents = cfg.get("agents", {})
    agent_id = args.agent
    if agent_id not in agents:
        known = ", ".join(sorted(agents))
        print(f"context: unknown agent {agent_id!r} — known: {known}", file=sys.stderr)
        return 1

    meta = agents[agent_id]
    claim = meta.get("claimName", agent_id)
    prefixes = ", ".join(meta.get("taskPrefixes", []))
    entry = meta.get("entrypoint", cfg.get("sharedBoot", "docs/wiki/SESSION_BOOT.md"))
    bucket = meta.get("bucketDefault")
    bucket_line = f"- Default triage bucket: **{bucket}** (see docs/wiki/IMPROVEMENT_LOOP.md)\n" if bucket else ""
    oc_agent = meta.get("openCodeAgent")
    oc_line = f"- OpenCode subagent: `{oc_agent}` (opencode run -a {oc_agent})\n" if oc_agent else ""

    digest_snip = ""
    digest_path = ROOT / cfg.get("wiki", {}).get("digest", "docs/wiki/DIGEST.md")
    if digest_path.is_file() and args.digest:
        lines = digest_path.read_text(encoding="utf-8").splitlines()[:20]
        lines = [ln.replace("\u2192", "->") for ln in lines]
        digest_snip = "\n".join(["", "## Recent digest (truncated)", ""] + lines + ["", "..."])

    block = f"""SYSTEM: Blue Hen RE session boot - agent={agent_id} ({meta.get("label", agent_id)})

1. uv run python scripts/pick_task.py blockers && pick_task.py list
2. Read docs/wiki/SESSION_BOOT.md and docs/wiki/GOALS.md
3. Claim: uv run python scripts/pick_task.py claim <ID> --agent {claim}
4. Lane entrypoint: {entry}
5. Task prefixes: {prefixes or "see work_queue"}
{bucket_line}{oc_line}- Classify edits: uv run python scripts/build_sync.py classify --path <file>
- Done: pick_task.py done <ID> && pick_task.py render
{meta.get("notes", "")}{digest_snip}
"""
    _safe_print(block.strip())
    return 0


def _jsonl_text_blob(path: Path, max_lines: int = 300) -> str:
    chunks: list[str] = []
    try:
        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return ""
    for line in lines[:max_lines]:
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            chunks.append(line)
            continue
        if obj.get("role") == "user" and isinstance(obj.get("message"), dict):
            for part in obj["message"].get("content", []):
                if isinstance(part, dict) and part.get("type") == "text":
                    chunks.append(part.get("text", ""))
        elif obj.get("role") == "assistant" and isinstance(obj.get("message"), dict):
            for part in obj["message"].get("content", []):
                if isinstance(part, dict):
                    if part.get("type") == "text":
                        chunks.append(part.get("text", ""))
                    elif part.get("type") == "tool_use":
                        chunks.append(f"tool:{part.get('name', '')}")
        elif obj.get("type") in ("user", "assistant") and isinstance(obj.get("message"), dict):
            msg = obj["message"]
            if isinstance(msg.get("content"), str):
                chunks.append(msg["content"])
            elif isinstance(msg.get("content"), list):
                for part in msg["content"]:
                    if isinstance(part, dict) and part.get("type") == "text":
                        chunks.append(part.get("text", ""))
        else:
            chunks.append(json.dumps(obj)[:200])
    return "\n".join(chunks)


def _first_user_topic(text: str, max_len: int = 72) -> str:
    for pat in (r"<user_query>\s*(.{20,200})", r"user_query.*?(\w.{20,200})"):
        m = re.search(pat, text, re.DOTALL | re.IGNORECASE)
        if m:
            topic = re.sub(r"\s+", " ", m.group(1)).strip()
            return topic[:max_len] + ("..." if len(topic) > max_len else "")
    for line in text.splitlines():
        line = line.strip()
        if len(line) > 30 and not line.startswith("{"):
            return line[:max_len] + ("..." if len(line) > max_len else "")
    return "(no topic extracted)"


def _analyze_session_file(path: Path, agent_id: str) -> dict:
    if path.suffix == ".jsonl":
        text = _jsonl_text_blob(path)
    else:
        try:
            text = path.read_text(encoding="utf-8", errors="replace")[:80_000]
        except OSError:
            text = ""

    tasks = sorted(set(TASK_ID_RE.findall(text)))
    blockers = sorted(set(BLOCKER_RE.findall(text)))
    signals: list[str] = []

    checks = [
        (r"pick_task\.py claim", "claimed task"),
        (r"pick_task\.py done", "completed task"),
        (r"autoresearch_run", "autoresearch run"),
        (r"autoresearch_train\.py", "train.py edit"),
        (r"<<<TASK_COMPLETE>>>", "loop complete"),
        (r"<<<NEED_HUMAN>>>", "escalated to human"),
        (r"build_sync\.py", "B.U.I.L.D. sync"),
        (r"pnpm review|pnpm build", "build gate"),
        (r"pytest", "pytest"),
        (r"BLK-DISK|ENOSPC|disk", "disk blocker"),
    ]
    for pat, label in checks:
        if re.search(pat, text, re.IGNORECASE):
            signals.append(label)

    mtime = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
    return {
        "agent": agent_id,
        "file": str(path.name),
        "mtime": mtime.strftime("%Y-%m-%d %H:%M"),
        "topic": _first_user_topic(text),
        "tasks": tasks,
        "blockers": blockers,
        "signals": signals,
    }


def _summarize_agent_sessions(agent_id: str, cutoff_days: int, now: datetime) -> dict:
    session_root = RAW / "sessions" / agent_id
    if not session_root.is_dir():
        return {"agent": agent_id, "sessions": 0, "tasks": [], "signals": [], "topics": [], "last_active": None}

    analyses: list[dict] = []
    for f in session_root.rglob("*"):
        if not f.is_file():
            continue
        age_days = (now.timestamp() - f.stat().st_mtime) / 86400
        if age_days > cutoff_days:
            continue
        analyses.append(_analyze_session_file(f, agent_id))

    analyses.sort(key=lambda a: a["mtime"], reverse=True)
    all_tasks: set[str] = set()
    all_signals: set[str] = set()
    topics: list[str] = []
    for a in analyses:
        all_tasks.update(a["tasks"])
        all_signals.update(a["signals"])
        if a["topic"] and a["topic"] not in topics:
            topics.append(a["topic"])

    return {
        "agent": agent_id,
        "sessions": len(analyses),
        "tasks": sorted(all_tasks),
        "signals": sorted(all_signals),
        "topics": topics[:5],
        "last_active": analyses[0]["mtime"] if analyses else None,
        "recent": analyses[:3],
    }


def _fetch_blockers_brief() -> list[str]:
    try:
        out = subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "pick_task.py"), "blockers"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )
        lines = [ln.strip() for ln in out.stdout.splitlines() if ln.strip().startswith("BLK-")]
        return lines[:5]
    except (subprocess.TimeoutExpired, OSError):
        return []


def cmd_reflect(args: argparse.Namespace) -> int:
    """Summarize recent raw ingest + agent session patterns into wiki/DIGEST.md."""
    digest_path = WIKI / "DIGEST.md"
    cutoff_days = args.days
    now = datetime.now(timezone.utc)
    rows: list[tuple[str, str, str]] = []

    for sub in ("arxiv", "sessions", "exports", "schemas"):
        subdir = RAW / sub
        if not subdir.is_dir():
            continue
        for f in sorted(subdir.rglob("*"), key=lambda p: p.stat().st_mtime, reverse=True):
            if not f.is_file():
                continue
            age_days = (now.timestamp() - f.stat().st_mtime) / 86400
            if age_days > cutoff_days:
                continue
            mtime = datetime.fromtimestamp(f.stat().st_mtime, tz=timezone.utc).strftime("%Y-%m-%d %H:%M")
            rows.append((mtime, sub, str(f.relative_to(ROOT))))

    rows = rows[:50]
    lines = [
        "# Raw → wiki digest",
        "",
        "> Generated by `pnpm build:reflect`. Do not edit manually — update source raw files and re-run.",
        "",
        f"_Last run: {now.strftime('%Y-%m-%d %H:%M UTC')}_",
        "",
        f"## Recent ingest (last {cutoff_days} days)",
        "",
        "| When | Source | Path |",
        "|---|---|---|",
    ]
    if rows:
        for when, source, path in rows:
            lines.append(f"| {when} | {source} | `{path}` |")
    else:
        lines.append("| — | — | No recent files — run `pnpm build:upload` or `pnpm build:inflow` |")

    cfg = _load_agents_config()
    agent_ids = ["cursor", "claude", "opencode"]
    summaries = [_summarize_agent_sessions(aid, cutoff_days, now) for aid in agent_ids]

    lines.extend(["", f"## Agent activity (last {cutoff_days} days)", ""])
    for summary in summaries:
        label = cfg.get("agents", {}).get(summary["agent"], {}).get("label", summary["agent"])
        lines.append(f"### {label} (`{summary['agent']}`)")
        if summary["sessions"] == 0:
            lines.append("- No ingested sessions — run `pnpm build:inflow-sessions`")
            lines.append("")
            continue
        lines.append(f"- Sessions ingested: {summary['sessions']}")
        if summary["last_active"]:
            lines.append(f"- Last active: {summary['last_active']}")
        if summary["tasks"]:
            lines.append(f"- Tasks mentioned: {', '.join(summary['tasks'][:12])}")
        if summary["signals"]:
            lines.append(f"- Patterns: {', '.join(summary['signals'])}")
        if summary["topics"]:
            lines.append("- Recent topics:")
            for t in summary["topics"]:
                lines.append(f"  - {t}")
        lines.append("")

    blocker_lines = _fetch_blockers_brief()
    lines.extend(["## Blockers snapshot", ""])
    if blocker_lines:
        for bl in blocker_lines:
            lines.append(f"- `{bl}`")
    else:
        lines.append("Run `pnpm work:blockers` for live status.")

    reflection_path = RAW / "reflections" / f"{now.strftime('%Y%m%d-%H%M%S')}-summary.json"
    reflection_path.parent.mkdir(parents=True, exist_ok=True)
    reflection_path.write_text(
        json.dumps({"at": now.isoformat(), "days": cutoff_days, "agents": summaries}, indent=2) + "\n",
        encoding="utf-8",
    )

    lines.extend(
        [
            "",
            "## Next reflection",
            "",
            "```powershell",
            "pnpm build:inflow-sessions",
            "pnpm build:reflect",
            "```",
            "",
            f"_Machine summary: `{reflection_path.relative_to(ROOT).as_posix()}`_",
            "",
        ]
    )
    digest_path.write_text("\n".join(lines), encoding="utf-8")
    active = sum(1 for s in summaries if s["sessions"] > 0)
    print(f"reflect: updated {digest_path.relative_to(ROOT)} ({len(rows)} files, {active}/3 agents active)")
    return 0


def _norm_path(path: str) -> str:
    return path.replace("\\", "/").lstrip("./")


def cmd_classify(args: argparse.Namespace) -> int:
    """Classify a change path into improvement-loop bucket 1/2/3."""
    rel = _norm_path(args.path)
    for pat in BUCKET3_PATTERNS:
        if re.search(pat, rel):
            print(f"bucket-3: architectural / subjective — {rel}")
            return 0
    for pat in BUCKET2_PATTERNS:
        if re.search(pat, rel):
            print(f"bucket-2: sign-off required — {rel}")
            return 0
    if rel.endswith(".md") and "docs/wiki/" in rel:
        print(f"bucket-1: wiki doc update — {rel}")
        return 0
    if rel.endswith((".py", ".ts", ".tsx")) and "test" in rel.lower():
        print(f"bucket-1: test file — {rel}")
        return 0
    print(f"bucket-2: default high-stakes for code — {rel}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="B.U.I.L.D. framework sync")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("upload", help="Bulk ingest historical docs and schemas")

    sub.add_parser("inflow-arxiv", help="Run arXiv radar and mirror to raw/")

    p_sess = sub.add_parser("inflow-sessions", help="Copy agent session logs to raw/")
    p_sess.add_argument("--agent", default="all", help="cursor|claude|opencode|all")
    p_sess.add_argument("--limit", type=int, default=20, help="Max files per agent")

    p_ctx = sub.add_parser("context", help="Print session boot block for an agent runtime")
    p_ctx.add_argument(
        "--agent",
        required=True,
        help="Agent id from config/agents.json (cursor, claude, opencode, opencode-research)",
    )
    p_ctx.add_argument("--digest", action="store_true", help="Append truncated wiki/DIGEST.md")

    p_refl = sub.add_parser("reflect", help="Update wiki/DIGEST.md from recent raw/")
    p_refl.add_argument("--days", type=int, default=7)

    p_cls = sub.add_parser("classify", help="Triage bucket for a path")
    p_cls.add_argument("--path", required=True)

    args = parser.parse_args()
    handlers = {
        "upload": cmd_upload,
        "inflow-arxiv": cmd_inflow_arxiv,
        "inflow-sessions": cmd_inflow_sessions,
        "context": cmd_context,
        "reflect": cmd_reflect,
        "classify": cmd_classify,
    }
    return handlers[args.cmd](args)


if __name__ == "__main__":
    raise SystemExit(main())
