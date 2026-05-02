"""In-memory FakeLLMClient for tests.

Returns a scripted sequence of LLMResponses. The orchestrator's tool loop is
exercised by setting up responses where the first one issues tool_calls and
the next returns final text.
"""
from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from app.services.chat.llm import LLMError, LLMResponse, Message


class FakeLLMClient:
    def __init__(self, scripted: Iterable[LLMResponse | LLMError]) -> None:
        self._queue = list(scripted)
        self.calls: list[dict[str, Any]] = []

    def complete(
        self,
        *,
        system: str,
        messages: list[Message],
        tools: list[dict[str, Any]],
        max_tokens: int = 1024,
    ) -> LLMResponse:
        self.calls.append(
            {"system": system, "messages": messages, "tools": tools, "max_tokens": max_tokens}
        )
        if not self._queue:
            raise AssertionError("FakeLLMClient ran out of scripted responses")
        next_item = self._queue.pop(0)
        if isinstance(next_item, LLMError):
            raise next_item
        return next_item
