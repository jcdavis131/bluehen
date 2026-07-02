"""OpenAI-compatible chat client for GLM (or any compatible endpoint).

Environment:
    GLM_API_KEY     required for live calls (no key → LLMUnavailable)
    GLM_BASE_URL    default https://api.z.ai/api/paas/v4
    GLM_MODEL       default glm-5.2

The client is deliberately minimal — messages in, (content, tool_calls)
out — so teams can stub it in tests and the platform is not coupled to
any provider SDK.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Any

DEFAULT_BASE_URL = "https://api.z.ai/api/paas/v4"
DEFAULT_MODEL = "glm-5.2"


class LLMUnavailable(RuntimeError):
    """Raised when no API key is configured — callers fall back to deterministic mode."""


@dataclass
class ToolCall:
    call_id: str
    name: str
    arguments: dict[str, Any]


@dataclass
class ChatResult:
    content: str | None
    tool_calls: list[ToolCall] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)


class GLMClient:
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
        timeout: float = 120.0,
    ) -> None:
        self.api_key = api_key or os.environ.get("GLM_API_KEY")
        self.base_url = (base_url or os.environ.get("GLM_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")
        self.model = model or os.environ.get("GLM_MODEL") or DEFAULT_MODEL
        self.timeout = timeout

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        temperature: float = 0.3,
    ) -> ChatResult:
        if not self.configured:
            raise LLMUnavailable(
                "GLM_API_KEY not set — export it (and optionally GLM_BASE_URL/GLM_MODEL) "
                "to enable LLM duties; deterministic duties run regardless."
            )
        import httpx

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"
        resp = httpx.post(
            f"{self.base_url}/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {self.api_key}"},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        msg = data["choices"][0]["message"]
        calls = []
        for tc in msg.get("tool_calls") or []:
            try:
                args = json.loads(tc["function"].get("arguments") or "{}")
            except json.JSONDecodeError:
                args = {"_raw": tc["function"].get("arguments")}
            calls.append(ToolCall(call_id=tc.get("id", ""), name=tc["function"]["name"], arguments=args))
        return ChatResult(content=msg.get("content"), tool_calls=calls, raw=data)
