"""OpenAI adapter for LLMClient.

Translates normalized Message/ToolCall/LLMResponse into chat.completions calls
and back. Tools come in as JSON Schema dicts and are wrapped in OpenAI's
function-tool envelope. Errors from the SDK are re-raised as LLMError so the
orchestrator can fall back gracefully.
"""
from __future__ import annotations

import json
import logging
from collections.abc import Iterator
from typing import Any

from openai import OpenAI, OpenAIError

from app.services.chat.llm import (
    LLMError,
    LLMResponse,
    Message,
    StreamDone,
    StreamEvent,
    TextDelta,
    ToolCall,
)

log = logging.getLogger(__name__)


class OpenAIClient:
    def __init__(self, api_key: str, model: str) -> None:
        if not api_key:
            raise LLMError("openai_api_key is not configured")
        self._client = OpenAI(api_key=api_key)
        self._model = model

    def complete(
        self,
        *,
        system: str,
        messages: list[Message],
        tools: list[dict[str, Any]],
        max_tokens: int = 2048,
        forced_tool: str | None = None,
    ) -> LLMResponse:
        payload, wrapped_tools = self._prepare(system, messages, tools)
        try:
            resp = self._client.chat.completions.create(
                model=self._model,
                messages=payload,
                tools=wrapped_tools or None,
                tool_choice=_tool_choice(wrapped_tools, forced_tool),
                max_completion_tokens=max_tokens,
                reasoning_effort="minimal",
                verbosity="low",
            )
        except OpenAIError as exc:
            log.warning("OpenAI request failed: %s", exc)
            raise LLMError(str(exc)) from exc

        choice = resp.choices[0]
        msg = choice.message

        tool_calls: list[ToolCall] = []
        for tc in msg.tool_calls or []:
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            tool_calls.append(
                ToolCall(id=tc.id, name=tc.function.name, arguments=args)
            )

        usage = {}
        if resp.usage is not None:
            usage = {
                "prompt_tokens": resp.usage.prompt_tokens or 0,
                "completion_tokens": resp.usage.completion_tokens or 0,
            }

        return LLMResponse(
            text=msg.content,
            tool_calls=tool_calls,
            finish_reason=_normalize_finish(choice.finish_reason),
            usage=usage,
        )

    def stream(
        self,
        *,
        system: str,
        messages: list[Message],
        tools: list[dict[str, Any]],
        max_tokens: int = 2048,
        forced_tool: str | None = None,
    ) -> Iterator[StreamEvent]:
        payload, wrapped_tools = self._prepare(system, messages, tools)
        try:
            stream = self._client.chat.completions.create(
                model=self._model,
                messages=payload,
                tools=wrapped_tools or None,
                tool_choice=_tool_choice(wrapped_tools, forced_tool),
                max_completion_tokens=max_tokens,
                reasoning_effort="minimal",
                verbosity="low",
                stream=True,
                stream_options={"include_usage": True},
            )
        except OpenAIError as exc:
            log.warning("OpenAI stream request failed: %s", exc)
            raise LLMError(str(exc)) from exc

        text_parts: list[str] = []
        # Tool call deltas are keyed by index — id/name/arguments arrive piecewise.
        tc_buf: dict[int, dict[str, Any]] = {}
        finish: str | None = None
        usage: dict[str, int] = {}

        try:
            for chunk in stream:
                if chunk.usage is not None:
                    usage = {
                        "prompt_tokens": chunk.usage.prompt_tokens or 0,
                        "completion_tokens": chunk.usage.completion_tokens or 0,
                    }
                if not chunk.choices:
                    continue
                choice = chunk.choices[0]
                delta = choice.delta
                if delta is not None:
                    if delta.content:
                        text_parts.append(delta.content)
                        yield TextDelta(text=delta.content)
                    for tc in delta.tool_calls or []:
                        slot = tc_buf.setdefault(
                            tc.index, {"id": "", "name": "", "arguments": ""}
                        )
                        if tc.id:
                            slot["id"] = tc.id
                        if tc.function is not None:
                            if tc.function.name:
                                slot["name"] = tc.function.name
                            if tc.function.arguments:
                                slot["arguments"] += tc.function.arguments
                if choice.finish_reason:
                    finish = choice.finish_reason
        except OpenAIError as exc:
            log.warning("OpenAI stream iteration failed: %s", exc)
            raise LLMError(str(exc)) from exc

        tool_calls: list[ToolCall] = []
        for _, slot in sorted(tc_buf.items()):
            if not slot["id"] and not slot["name"]:
                continue
            try:
                args = json.loads(slot["arguments"] or "{}")
            except json.JSONDecodeError:
                args = {}
            tool_calls.append(
                ToolCall(id=slot["id"], name=slot["name"], arguments=args)
            )

        yield StreamDone(
            response=LLMResponse(
                text="".join(text_parts) or None,
                tool_calls=tool_calls,
                finish_reason=_normalize_finish(finish),
                usage=usage,
            )
        )

    def _prepare(
        self,
        system: str,
        messages: list[Message],
        tools: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        payload: list[dict[str, Any]] = [{"role": "system", "content": system}]
        for m in messages:
            payload.append(_to_openai(m))
        wrapped_tools = [
            {
                "type": "function",
                "function": {
                    "name": t["name"],
                    "description": t.get("description", ""),
                    "parameters": t["parameters"],
                },
            }
            for t in tools
        ]
        return payload, wrapped_tools


def _tool_choice(
    wrapped_tools: list[dict[str, Any]], forced_tool: str | None
) -> Any:
    if not wrapped_tools:
        return None
    if forced_tool:
        return {"type": "function", "function": {"name": forced_tool}}
    return "auto"


def _normalize_finish(finish: str | None) -> str:
    if finish == "tool_calls":
        return "tool_calls"
    if finish == "length":
        return "length"
    return "stop"


def _to_openai(m: Message) -> dict[str, Any]:
    if m.role == "tool":
        return {
            "role": "tool",
            "tool_call_id": m.tool_call_id or "",
            "content": m.content or "",
        }
    if m.role == "assistant" and m.tool_calls:
        return {
            "role": "assistant",
            "content": m.content,
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.name,
                        "arguments": json.dumps(tc.arguments),
                    },
                }
                for tc in m.tool_calls
            ],
        }
    return {"role": m.role, "content": m.content or ""}
