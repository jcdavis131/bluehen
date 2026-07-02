"""Offline eval gate (spec 0014): no network, no GLM key required."""

import json

import pytest

from agentkit.agent import Agent
from agentkit.llm import ChatResult, GLMClient, LLMUnavailable, ToolCall
from agentkit.team import run_team
from agentkit.teams import TEAMS, get_team
from agentkit.tools import Tool, ToolRegistry, default_registry


# -- tools -------------------------------------------------------------------

def test_default_registry_specs_are_valid_tool_schemas():
    specs = default_registry().specs()
    assert len(specs) >= 7
    for spec in specs:
        assert spec["type"] == "function"
        fn = spec["function"]
        assert fn["name"] and fn["description"]
        assert fn["parameters"]["type"] == "object"


def test_allowlist_enforced():
    reg = default_registry()
    out = reg.call("work_queue_summary", {}, allowlist=["list_datasets"])
    assert "not in this team's allowlist" in out["error"]
    assert reg.call("nope", {})["error"].startswith("unknown tool")


def test_tool_errors_do_not_raise():
    reg = ToolRegistry([Tool("boom", "explodes", {"type": "object", "properties": {}}, lambda: 1 / 0)])
    out = reg.call("boom", {})
    assert "ZeroDivisionError" in out["error"]


# -- llm ---------------------------------------------------------------------

def test_llm_unavailable_without_key(monkeypatch):
    monkeypatch.delenv("GLM_API_KEY", raising=False)
    client = GLMClient()
    assert not client.configured
    with pytest.raises(LLMUnavailable):
        client.chat([{"role": "user", "content": "hi"}])


def test_glm_env_config(monkeypatch):
    monkeypatch.setenv("GLM_API_KEY", "k")
    monkeypatch.setenv("GLM_MODEL", "glm-5.2-air")
    monkeypatch.setenv("GLM_BASE_URL", "https://example.test/v4/")
    client = GLMClient()
    assert client.configured
    assert client.model == "glm-5.2-air"
    assert client.base_url == "https://example.test/v4"


# -- agent loop with a stubbed LLM ------------------------------------------

class StubClient:
    """First turn calls a tool, second turn answers."""

    configured = True

    def __init__(self):
        self.turns = 0
        self.seen_tool_output = None

    def chat(self, messages, tools=None, temperature=0.3):
        self.turns += 1
        if self.turns == 1:
            return ChatResult(content=None, tool_calls=[
                ToolCall(call_id="c1", name="echo", arguments={"text": "ping"}),
            ])
        self.seen_tool_output = messages[-1]["content"]
        return ChatResult(content="done: pong")


def _echo_registry():
    return ToolRegistry([
        Tool("echo", "echo text back", {
            "type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"],
        }, lambda text: {"echo": text.replace("ping", "pong")}),
    ])


def test_agent_tool_loop(tmp_path):
    stub = StubClient()
    agent = Agent("t", "charter", _echo_registry(), ["echo"], client=stub,
                  transcript_root=tmp_path)
    final = agent.run("do the thing")
    assert final == "done: pong"
    assert "pong" in stub.seen_tool_output
    lines = (agent.transcript.path / "transcript.jsonl").read_text(encoding="utf-8").splitlines()
    records = [json.loads(l) for l in lines]
    assert any(r.get("role") == "tool" for r in records)


def test_agent_max_turns(tmp_path):
    class LoopingStub:
        configured = True

        def chat(self, messages, tools=None, temperature=0.3):
            return ChatResult(content=None, tool_calls=[
                ToolCall(call_id="x", name="echo", arguments={"text": "again"}),
            ])

    agent = Agent("t", "charter", _echo_registry(), ["echo"], client=LoopingStub(),
                  max_turns=3, transcript_root=tmp_path)
    assert "max turns" in agent.run("loop forever")


# -- teams -------------------------------------------------------------------

def test_all_teams_defined():
    assert set(TEAMS) == {"data-harvesting", "rnd", "operations"}
    for team in TEAMS.values():
        assert team.charter and team.tool_allowlist and team.deterministic_duties
    with pytest.raises(KeyError):
        get_team("nope")


def test_run_team_deterministic_only(tmp_path, monkeypatch):
    monkeypatch.delenv("GLM_API_KEY", raising=False)
    team = get_team("operations")
    report = run_team(
        team,
        knowledge_root=tmp_path / "knowledge",
        transcript_root=tmp_path / "agents",
    )
    assert report["team"] == "operations"
    assert {d["duty"] for d in report["duties"]} == {"blockers-report", "platform-health"}
    assert report["llmStatus"].startswith("skipped")
    okf = (tmp_path / "knowledge" / "teams" / "operations.md").read_text(encoding="utf-8")
    assert "type: Team Report" in okf
    assert "# Runs" in okf


def test_run_team_appends_to_existing_report(tmp_path, monkeypatch):
    monkeypatch.delenv("GLM_API_KEY", raising=False)
    team = get_team("operations")
    for _ in range(2):
        run_team(team, knowledge_root=tmp_path / "knowledge",
                 transcript_root=tmp_path / "agents")
    okf = (tmp_path / "knowledge" / "teams" / "operations.md").read_text(encoding="utf-8")
    assert okf.count("run `") == 2
    assert okf.count("type: Team Report") == 1  # frontmatter not duplicated
