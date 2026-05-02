"""Provider-agnostic LLM wrapper used by the chat orchestrator.

Adapters translate between provider SDKs (OpenAI, Anthropic) and the normalized
Message / ToolCall / LLMResponse shapes below. The orchestrator only ever talks
to LLMClient; swapping providers is an env-flag flip.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Protocol

Role = Literal["system", "user", "assistant", "tool"]
FinishReason = Literal["stop", "tool_calls", "length", "error"]


class LLMError(Exception):
    """Raised by adapters when the upstream provider fails."""


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict[str, Any]


@dataclass
class Message:
    role: Role
    content: str | None = None
    tool_calls: list[ToolCall] = field(default_factory=list)
    tool_call_id: str | None = None  # only when role == "tool"


@dataclass
class LLMResponse:
    text: str | None
    tool_calls: list[ToolCall]
    finish_reason: FinishReason
    usage: dict[str, int] = field(default_factory=dict)


class LLMClient(Protocol):
    def complete(
        self,
        *,
        system: str,
        messages: list[Message],
        tools: list[dict[str, Any]],
        max_tokens: int = 1024,
    ) -> LLMResponse: ...
