"""CLI: uv run python -m agentkit {list,run <team> [--once|--loop N]}."""

from __future__ import annotations

import argparse
import json
import time

from agentkit.llm import GLMClient
from agentkit.team import run_team
from agentkit.teams import TEAMS, get_team


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="agentkit")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("list", help="list registered teams")

    p_run = sub.add_parser("run", help="run a team")
    p_run.add_argument("team", choices=sorted(TEAMS))
    p_run.add_argument("--once", action="store_true", help="single run (default)")
    p_run.add_argument("--loop", type=int, metavar="MINUTES", default=0,
                       help="re-run every N minutes")

    args = parser.parse_args(argv)

    if args.cmd == "list":
        client = GLMClient()
        mode = f"LLM enabled ({client.model})" if client.configured else "deterministic only (set GLM_API_KEY for LLM duties)"
        print(f"mode: {mode}")
        for team in TEAMS.values():
            duties = ", ".join(d.name for d in team.deterministic_duties)
            print(f"  {team.id:16s} {team.division:14s} duties: {duties}")
        return 0

    if args.cmd == "run":
        team = get_team(args.team)
        while True:
            report = run_team(team)
            print(json.dumps(
                {k: report[k] for k in ("runId", "team", "llmStatus")}
                | {"duties": [{d["duty"]: d["status"]} for d in report["duties"]]},
            ))
            if report.get("llmSummary"):
                print(report["llmSummary"])
            if not args.loop:
                return 0
            time.sleep(args.loop * 60)

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
