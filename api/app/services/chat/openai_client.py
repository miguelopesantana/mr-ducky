"""OpenAI adapter for LLMClient.

Translates normalized Message/ToolCall/LLMResponse into chat.completions calls
and back. Tools come in as JSON Schema dicts and are wrapped in OpenAI's
function-tool envelope. Errors from the SDK are re-raised as LLMError so the
orchestrator can fall back gracefully.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from openai import OpenAI, OpenAIError

from app.services.chat.llm import (
    LLMError,
    LLMResponse,
    Message,
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
        max_tokens: int = 1024,
    ) -> LLMResponse:
        payload = [{"role": "system", "content": system}]
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

        try:
            resp = self._client.chat.completions.create(
                model=self._model,
                messages=payload,
                tools=wrapped_tools or None,
                tool_choice="auto" if wrapped_tools else None,
                max_completion_tokens=max_tokens,
            )
        except OpenAIError as exc:
            log.warning("OpenAI request failed: %s", exc)
            raise LLMError(str(exc)) from exc

        choice = resp.choices[0]
        msg = choice.message
        finish = choice.finish_reason or "stop"
        if finish == "tool_calls":
            normalized_finish = "tool_calls"
        elif finish == "length":
            normalized_finish = "length"
        else:
            normalized_finish = "stop"

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
            finish_reason=normalized_finish,
            usage=usage,
        )


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
