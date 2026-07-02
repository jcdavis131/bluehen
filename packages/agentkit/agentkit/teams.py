"""The three org teams (Spec 0014): Data Harvesting, R&D, Operations.

Charters follow the division model in config/org-divisions.json. Duties
are split deliberately: everything that MUST happen each run is
deterministic code; the LLM adds judgment on top, never load-bearing.
"""

from __future__ import annotations

from typing import Any

from agentkit.team import Duty, Team
from agentkit.tools import ToolRegistry

_COMMON_RULES = """
Operating rules (non-negotiable):
- Evidence-backed voice: never state a number you did not read from a tool.
- You may claim queue work conceptually but NEVER edit training code or deploy.
- Prefer small, reversible actions; anything irreversible goes in your report
  as a recommendation for the Operator instead.
- Finish with a concise report: what you observed, what you did, what you
  recommend next (max ~300 words).
"""


def _duty_watch_tick(registry: ToolRegistry) -> dict[str, Any]:
    return registry.call("watch_tick", {})


def _duty_dataset_inventory(registry: ToolRegistry) -> dict[str, Any]:
    out = registry.call("list_datasets", {"limit": 5})
    datasets = out.get("datasets", []) if isinstance(out, dict) else []
    return {
        "recent": [
            {"id": d["dataset_id"], "docs": d["doc_count"], "chunks": d["chunk_count"]}
            for d in datasets
        ]
    }


def _duty_queue_snapshot(registry: ToolRegistry) -> dict[str, Any]:
    out = registry.call("work_queue_summary", {})
    if not isinstance(out, dict):
        return {"error": "queue unavailable"}
    research = [t for t in out.get("open", []) if str(t.get("id", "")).startswith(("AR-", "RAG-", "RT-", "DATA-"))]
    return {"researchOpen": research, "blockers": [b.get("id") for b in out.get("blockers", [])]}


def _duty_telemetry_review(registry: ToolRegistry) -> dict[str, Any]:
    runs = registry.call("list_runs", {"limit": 5})
    if not isinstance(runs, dict):
        return {"error": "runboard unavailable"}
    findings = []
    for run in runs.get("runs", []):
        events = registry.call("run_events", {"run_id": run["id"]})
        kinds = [e.get("kind") for e in events.get("events", [])] if isinstance(events, dict) else []
        findings.append({
            "run": run["id"],
            "status": run.get("status"),
            "collapseAlerts": kinds.count("collapse_alert"),
            "surgeries": kinds.count("surgery"),
        })
    return {"runs": findings}


def _duty_blockers_report(registry: ToolRegistry) -> dict[str, Any]:
    out = registry.call("work_queue_summary", {})
    if not isinstance(out, dict):
        return {"error": "queue unavailable"}
    stale = [t for t in out.get("open", []) if t.get("claimedBy")]
    return {
        "blockers": out.get("blockers", []),
        "openCount": out.get("openCount"),
        "claimed": stale,
    }


def _duty_platform_health(registry: ToolRegistry) -> dict[str, Any]:
    datasets = registry.call("list_datasets", {"limit": 1})
    runs = registry.call("list_runs", {"limit": 1})
    ok = isinstance(datasets, dict) and isinstance(runs, dict)
    return {
        "datalab": "ok" if isinstance(datasets, dict) and "datasets" in datasets else "degraded",
        "runboard": "ok" if isinstance(runs, dict) and "runs" in runs else "degraded",
        "overall": "ok" if ok else "degraded",
    }


DATA_HARVESTING = Team(
    id="data-harvesting",
    name="Data Harvesting Team",
    division="data",
    charter=f"""You are the Data Harvesting team lead for Blue Hen RE (the Data
Miners division). Your mandate: keep the OKF dataset library growing with
point-in-time, provenance-carrying datasets the R&D team can train on.
You operate the continuous dataset builder (source registry + watch loop)
and curate new sources when coverage gaps appear. You may add sources to
the registry (additive only) when clearly justified by the platform's
research needs.{_COMMON_RULES}""",
    tool_allowlist=[
        "watch_tick", "list_watch_sources", "add_watch_source",
        "list_datasets", "read_knowledge",
    ],
    deterministic_duties=[
        Duty("watch-tick", "Run the dataset builder over due sources", _duty_watch_tick),
        Duty("dataset-inventory", "Inventory recent datasets", _duty_dataset_inventory),
    ],
    llm_task=(
        "Execute the data-harvesting playbook, in order: "
        "(1) list_watch_sources and compare coverage against the venture map in "
        "read_knowledge('platform/commercial-platform.md') — every venture with a "
        "consented data path needs at least one registry source. "
        "(2) Score each gap: value to R&D training (contrastive pairs, relevance labels) "
        "over acquisition cost. "
        "(3) Register AT MOST 2 new sources this run via add_watch_source (https URLs or "
        "existing repo paths only; pick intervalMinutes matching real change cadence). "
        "(4) Run watch_tick and confirm new sources materialize or report their errors. "
        "(5) Report: sources added with one-line justification, datasets materialized vs "
        "unchanged, coverage gaps deliberately left open and why. "
        "Escalate (in the report, addressed to the orchestrator) if any source has "
        "failed 3 consecutive runs."
    ),
)

RND = Team(
    id="rnd",
    name="R&D Team",
    division="research",
    charter=f"""You are the R&D team lead for Blue Hen RE (research division).
Your mandate: keep the autoresearch pipeline moving — triage the open
research queue (AR-*/RAG-*/RT-*/DATA-*), watch training telemetry for
collapse events, and prioritize the delegate queue. You do NOT edit
training code; you prepare and prioritize work for the delegate lanes
(Claude/Cursor/OpenCode).{_COMMON_RULES}""",
    tool_allowlist=[
        "work_queue_summary", "list_runs", "run_events",
        "list_datasets", "read_knowledge",
    ],
    deterministic_duties=[
        Duty("queue-snapshot", "Open research queue + blockers", _duty_queue_snapshot),
        Duty("telemetry-review", "Recent runs, collapse alerts, surgeries", _duty_telemetry_review),
    ],
    llm_task=(
        "Execute the R&D triage playbook, in order: "
        "(1) From the queue snapshot, rank open AR-/RAG-/RT- items by expected evidence "
        "value per compute-hour; output the top 3 with one-line rationale each and which "
        "delegate lane should run them (claude / opencode research). "
        "(2) From the telemetry review, flag every run with collapse alerts or surgeries: "
        "write a one-paragraph hypothesis (what likely collapsed and why) citing the "
        "run id — never speculate without naming the run. "
        "(3) Cross-check list_datasets for corpora large enough to train on that no "
        "queue item covers; propose (do NOT execute) new queue items with an explicit "
        "eval gate for each. "
        "(4) Report in the standing format: NEXT (3 ranked), WATCH (collapse flags), "
        "PROPOSE (new items). You never edit training code or merge recipes."
    ),
)

OPERATIONS = Team(
    id="operations",
    name="Operations Team",
    division="orchestration",
    charter=f"""You are the Operations team lead for Blue Hen RE (orchestration +
execution divisions). Your mandate: keep the org unblocked — surface
blockers with concrete unblock steps, flag stale task claims, verify the
platform surfaces (datalab, runboard) are healthy, and produce the daily
status digest the Operator reads first.{_COMMON_RULES}""",
    tool_allowlist=[
        "work_queue_summary", "list_runs", "list_datasets", "read_knowledge",
    ],
    deterministic_duties=[
        Duty("blockers-report", "Blockers + claimed/stale tasks", _duty_blockers_report),
        Duty("platform-health", "Datalab + runboard health check", _duty_platform_health),
    ],
    llm_task=(
        "Execute the operations playbook, in order: "
        "(1) Health sweep: from platform-health duty results plus work_queue blockers, "
        "verify each production arrow (datalab ok, runboard ok, open blockers count). "
        "(2) Reap: list queue items claimed >48h with no status change as candidates to "
        "unclaim (recommend, do not modify). "
        "(3) Digest for the Operator, exactly this format: HEALTH (one line), "
        "BLOCKERS (ranked, each with the single next unblock action and owner), "
        "REAP (stale claims), SPEND (budget notes if visible in duties). "
        "(4) End with the one thing the Operator should do today. "
        "Escalate loudly at the top of the report if any live surface is degraded."
    ),
)

TEAMS: dict[str, Team] = {t.id: t for t in (DATA_HARVESTING, RND, OPERATIONS)}


def get_team(team_id: str) -> Team:
    if team_id not in TEAMS:
        raise KeyError(f"unknown team '{team_id}' — known: {', '.join(TEAMS)}")
    return TEAMS[team_id]
