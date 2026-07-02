"""Team runner: deterministic duties always, LLM duties when configured.

A team run produces:
  - data/agents/<run_id>/           transcript + duty outputs
  - knowledge/teams/<team>.md       living OKF report (latest run appended
                                    under a dated heading, newest first)
"""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from agentkit.agent import Agent
from agentkit.llm import GLMClient, LLMUnavailable
from agentkit.tools import ToolRegistry, default_registry, _repo_root


@dataclass
class Duty:
    name: str
    description: str
    fn: Callable[[ToolRegistry], dict[str, Any]]


@dataclass
class Team:
    id: str
    name: str
    division: str
    charter: str
    tool_allowlist: list[str]
    deterministic_duties: list[Duty]
    llm_task: str  # the standing instruction for the LLM loop
    max_turns: int = 8


def run_team(
    team: Team,
    *,
    registry: ToolRegistry | None = None,
    client: GLMClient | None = None,
    knowledge_root: str | Path | None = None,
    transcript_root: str | Path | None = None,
) -> dict[str, Any]:
    registry = registry or default_registry()
    client = client or GLMClient()
    started = datetime.now(timezone.utc)
    run_id = f"{time.strftime('%Y%m%d-%H%M%S')}-{team.id}"
    root = transcript_root or (_repo_root() / "data" / "agents")

    duty_results: list[dict[str, Any]] = []
    for duty in team.deterministic_duties:
        try:
            out = duty.fn(registry)
            duty_results.append({"duty": duty.name, "status": "ok", "output": out})
        except Exception as e:
            duty_results.append({
                "duty": duty.name, "status": "error", "output": {"error": str(e)[:300]},
            })

    llm_summary: str | None = None
    llm_status = "skipped (GLM_API_KEY not set)"
    if client.configured:
        agent = Agent(
            name=team.id,
            charter=team.charter,
            registry=registry,
            allowlist=team.tool_allowlist,
            client=client,
            max_turns=team.max_turns,
            transcript_root=root,
        )
        try:
            context = json.dumps(duty_results, default=str)[:8000]
            llm_summary = agent.run(
                f"{team.llm_task}\n\nDeterministic duty results from this run:\n{context}"
            )
            llm_status = "ok"
        except LLMUnavailable as e:
            llm_status = f"unavailable: {e}"
        except Exception as e:
            llm_status = f"error: {type(e).__name__}: {str(e)[:200]}"

    report = {
        "runId": run_id,
        "team": team.id,
        "division": team.division,
        "startedAt": started.isoformat(),
        "duties": duty_results,
        "llmStatus": llm_status,
        "llmSummary": llm_summary,
    }

    out_dir = Path(root) / run_id
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "report.json").write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    _write_okf_report(team, report, knowledge_root or (_repo_root() / "knowledge"))
    return report


def _write_okf_report(team: Team, report: dict[str, Any], knowledge_root: str | Path) -> None:
    from datalab.okf import Bundle, frontmatter

    bundle = Bundle(knowledge_root)
    path = bundle.concept_path(f"teams/{team.id}")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    duty_lines = []
    for d in report["duties"]:
        summary = json.dumps(d["output"], default=str)
        summary = (summary[:300] + "…") if len(summary) > 300 else summary
        duty_lines.append(f"| {d['duty']} | {d['status']} | `{summary}` |")
    entry = (
        f"## {today} — run `{report['runId']}`\n\n"
        f"| Duty | Status | Result |\n|---|---|---|\n" + "\n".join(duty_lines) + "\n\n"
        f"**LLM loop:** {report['llmStatus']}\n"
        + (f"\n{report['llmSummary']}\n" if report.get("llmSummary") else "")
    )

    if path.exists():
        text = path.read_text(encoding="utf-8")
        # refresh frontmatter timestamp, then insert the new run after "# Runs"
        text = re.sub(r"^timestamp: .*$", f"timestamp: {ts}", text, count=1, flags=re.M)
        if "# Runs" in text:
            text = text.replace("# Runs\n", f"# Runs\n\n{entry}\n", 1)
        else:
            text = text.rstrip() + f"\n\n# Runs\n\n{entry}\n"
        path.write_text(text, encoding="utf-8")
        return

    fm = frontmatter({
        "type": "Team Report",
        "title": f"{team.name} — run log",
        "description": f"Living run log for the {team.name} ({team.division} division).",
        "tags": ["team", "agents", team.division],
        "timestamp": ts,
    })
    body = (
        f"{fm}\n\n{team.charter.strip()}\n\n"
        f"Runs append below, newest first. Transcripts live in `data/agents/`.\n\n"
        f"# Runs\n\n{entry}\n"
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body, encoding="utf-8")
    bundle.add_index_entry(
        "teams", team.name, f"{team.id}.md",
        f"{team.division} division run log", section="Teams",
    )
