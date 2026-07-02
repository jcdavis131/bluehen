"""Multi-platform paper-trading simulation environment."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

from omni_sim.kag import log_trajectory
from omni_sim.platforms import applied_rule_ids, get_platform
from omni_sim.smart_search import smart_search

REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURES_PATH = REPO_ROOT / "data" / "omni" / "fixtures.jsonl"
SKILL_DEFAULT = REPO_ROOT / "config" / "omni-skills" / "best_skill.md"


def _load_fixtures(path: Path | None = None) -> list[dict[str, Any]]:
    p = path or FIXTURES_PATH
    if not p.exists():
        return []
    rows = []
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def _platform_fixtures(platform_id: str, fixtures: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [f for f in fixtures if f.get("platformId") == platform_id or f.get("platformId") == "all"]


def _sharpe(returns: list[float]) -> float:
    if len(returns) < 2:
        return 0.0
    mean = sum(returns) / len(returns)
    var = sum((r - mean) ** 2 for r in returns) / (len(returns) - 1)
    std = math.sqrt(var) if var > 0 else 1e-9
    return mean / std * math.sqrt(252)


def run_simulation(
    platform_id: str,
    *,
    strategy_id: str = "baseline-momentum",
    corpus_id: str = "omni-fixtures",
    skill_path: Path | str | None = None,
    bankroll: float = 10_000.0,
    live_capital: bool = False,
) -> dict[str, Any]:
    """
    Paper-trade fixture outcomes with platform rule enforcement.
    Raises ValueError on unknown platform or live_capital request.
    """
    if live_capital:
        raise PermissionError("live capital execution is blocked in simulation mode (Spec 0013)")

    platform = get_platform(platform_id)
    if not platform.get("simulationOnly", True):
        raise PermissionError(f"platform {platform_id} not approved for simulation")

    constraints = platform.get("executionConstraints", {})
    if constraints.get("liveCapital"):
        raise PermissionError("platform registry marks liveCapital=false")

    skill_file = Path(skill_path) if skill_path else SKILL_DEFAULT
    skill_text = skill_file.read_text(encoding="utf-8") if skill_file.exists() else ""

    fixtures = _platform_fixtures(platform_id, _load_fixtures())
    rule_docs = [{"id": r["id"], "text": f"{r.get('rules','')} {r.get('evidence','')}"} for r in platform.get("rootMemoryUnits", [])]
    corpus_docs = [{"id": f["id"], "text": f.get("narrative", "")} for f in fixtures]

    context_hits = smart_search(f"{platform_id} {strategy_id}", rule_docs + corpus_docs)

    trades: list[dict[str, Any]] = []
    returns: list[float] = []
    position = 0.0
    prev_weight = 0.0
    turnover = 0.0

    for fix in fixtures:
        edge = float(fix.get("edge", 0.0))
        outcome = float(fix.get("outcomeReturn", 0.0))
        ts = fix.get("ts", "")
        if _has_lookahead(ts, fix.get("asOf")):
            raise ValueError(f"look-ahead bias detected in fixture {fix.get('id')}")

        # Simple momentum: take position proportional to edge, capped by platform
        max_pos = float(constraints.get("maxPositionUsd", bankroll * 0.05))
        target_weight = max(-1.0, min(1.0, edge * 10))
        notional = abs(target_weight) * min(max_pos, bankroll * 0.05)
        pnl = outcome * target_weight * (notional / bankroll)
        returns.append(pnl)
        turnover += abs(target_weight - prev_weight)
        prev_weight = target_weight
        position += pnl

        trades.append(
            {
                "fixtureId": fix.get("id"),
                "edge": edge,
                "weight": target_weight,
                "pnl": round(pnl, 6),
                "rulesApplied": applied_rule_ids(platform),
            }
        )

        log_trajectory(
            state={"platformId": platform_id, "bankroll": bankroll, "ts": ts},
            action={"strategyId": strategy_id, "weight": target_weight, "fixtureId": fix.get("id")},
            observation={"outcomeReturn": outcome, "contextHits": [h.doc_id for h in context_hits[:3]]},
            verifier={"pnl": pnl, "simulation": True},
        )

    sharpe = round(_sharpe(returns), 4)
    gamma = 0.1
    penalized = sharpe - gamma * turnover / max(len(trades), 1)

    return {
        "mode": "simulation",
        "platformId": platform_id,
        "strategyId": strategy_id,
        "corpusId": corpus_id,
        "skillPath": str(skill_file),
        "skillLoaded": bool(skill_text),
        "sharpe": sharpe,
        "penalizedSharpe": round(penalized, 4),
        "turnover": round(turnover, 4),
        "trades": trades,
        "tradeCount": len(trades),
        "platformRulesApplied": applied_rule_ids(platform),
        "contextRetrieval": [{"id": h.doc_id, "score": h.score} for h in context_hits[:5]],
        "bankrollStart": bankroll,
        "bankrollEnd": round(bankroll * (1 + sum(returns)), 2),
    }


def _has_lookahead(ts: str, as_of: str | None) -> bool:
    """Reject fixtures where event timestamp precedes knowledge cutoff."""
    if not ts or not as_of:
        return False
    return ts < as_of
