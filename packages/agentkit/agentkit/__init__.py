"""agentkit — autonomous agent teams for the SynthaEmbed org (Spec 0014).

Three teams run the five-division operating loop as agents:

    python -m agentkit run data-harvesting --once
    python -m agentkit run rnd --once
    python -m agentkit run operations --once

Deterministic duties always execute (no LLM required); with GLM_API_KEY
set, each team also runs a bounded GLM tool-calling loop for the
judgment-heavy duties. Every run writes a transcript to data/agents/ and
a report into the OKF bundle (knowledge/teams/).
"""

from agentkit.agent import Agent
from agentkit.llm import GLMClient, LLMUnavailable
from agentkit.team import Team, run_team
from agentkit.teams import TEAMS, get_team

__all__ = [
    "Agent",
    "GLMClient",
    "LLMUnavailable",
    "Team",
    "run_team",
    "TEAMS",
    "get_team",
]
