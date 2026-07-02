"""Single agent: charter + bounded GLM tool-calling loop with transcript."""

from __future__ import annotations

import json
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from agentkit.llm import ChatResult, GLMClient
from agentkit.tools import ToolRegistry


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Transcript:
    def __init__(self, root: str | Path, run_id: str) -> None:
        self.path = Path(root) / run_id
        self.path.mkdir(parents=True, exist_ok=True)

    def append(self, record: dict[str, Any]) -> None:
        with (self.path / "transcript.jsonl").open("a", encoding="utf-8") as fh:
            fh.write(json.dumps({"ts": _now(), **record}, default=str) + "\n")


class Agent:
    def __init__(
        self,
        name: str,
        charter: str,
        registry: ToolRegistry,
        allowlist: list[str],
        client: GLMClient | None = None,
        max_turns: int = 8,
        transcript_root: str | Path = Path("data") / "agents",
    ) -> None:
        self.name = name
        self.charter = charter
        self.registry = registry
        self.allowlist = allowlist
        self.client = client or GLMClient()
        self.max_turns = max_turns
        self.run_id = f"{time.strftime('%Y%m%d-%H%M%S')}-{name}-{uuid.uuid4().hex[:6]}"
        self.transcript = Transcript(transcript_root, self.run_id)

    def run(self, task: str) -> str:
        """Bounded tool-calling loop; returns the agent's final message."""
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": self.charter},
            {"role": "user", "content": task},
        ]
        self.transcript.append({"role": "user", "content": task, "agent": self.name})
        tools = self.registry.specs(self.allowlist)

        for turn in range(self.max_turns):
            result: ChatResult = self.client.chat(messages, tools=tools)
            if not result.tool_calls:
                final = result.content or "(no content)"
                self.transcript.append({"role": "assistant", "content": final, "turn": turn})
                return final

            messages.append({
                "role": "assistant",
                "content": result.content,
                "tool_calls": [
                    {
                        "id": tc.call_id,
                        "type": "function",
                        "function": {"name": tc.name, "arguments": json.dumps(tc.arguments)},
                    }
                    for tc in result.tool_calls
                ],
            })
            for tc in result.tool_calls:
                output = self.registry.call(tc.name, tc.arguments, self.allowlist)
                self.transcript.append({
                    "role": "tool", "turn": turn, "tool": tc.name,
                    "arguments": tc.arguments, "output": output,
                })
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.call_id,
                    "content": json.dumps(output, default=str)[:16000],
                })

        self.transcript.append({"role": "system", "content": "max turns reached"})
        return "(stopped: max turns reached without a final answer)"
