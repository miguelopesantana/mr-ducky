"""Orchestrator tests: tool loop, multi-tool, iteration cap, error fallback."""
from __future__ import annotations

import pytest

from app.deps import get_llm_client
from app.main import app
from app.services.chat.fake_llm import FakeLLMClient
from app.services.chat.llm import LLMError, LLMResponse, ToolCall


def _final(text: str) -> LLMResponse:
    return LLMResponse(text=text, tool_calls=[], finish_reason="stop")


def _tool(name: str, args: dict, *, call_id: str = "tc1") -> LLMResponse:
    return LLMResponse(
        text=None,
        tool_calls=[ToolCall(id=call_id, name=name, arguments=args)],
        finish_reason="tool_calls",
    )


@pytest.fixture()
def fake_llm():
    state: dict = {"client": None}

    def _override():
        return state["client"]

    app.dependency_overrides[get_llm_client] = _override
    try:
        yield state
    finally:
        app.dependency_overrides.pop(get_llm_client, None)


def test_tool_loop_executes_and_returns_final(client, auth_headers, fake_llm):
    # Seed a category so list_categories has something to return.
    client.post(
        "/categories",
        json={"name": "Food", "emoji": "🍕", "color": "#000000", "monthlyBudget": 0},
        headers=auth_headers,
    )

    fake_llm["client"] = FakeLLMClient(
        [
            _tool("list_categories", {}),
            _final("You have one category: Food."),
        ]
    )

    body = client.post(
        "/chat", json={"message": "what categories?"}, headers=auth_headers
    ).json()
    assert body["message"] == "You have one category: Food."
    assert len(body["traces"]) == 1
    trace = body["traces"][0]
    assert trace["name"] == "list_categories"
    assert trace["error"] is None
    assert trace["output"]["categories"][0]["name"] == "Food"


def test_tool_loop_handles_invalid_args_then_recovers(client, auth_headers, fake_llm):
    # Bad args (negative limit) → tool returns error → model recovers with final text.
    fake_llm["client"] = FakeLLMClient(
        [
            _tool("query_transactions", {"limit": 999}),  # > max=50
            _final("I could not run that lookup."),
        ]
    )
    body = client.post(
        "/chat", json={"message": "show me everything"}, headers=auth_headers
    ).json()
    assert body["message"] == "I could not run that lookup."
    assert body["traces"][0]["error"] is not None
    assert "invalid arguments" in body["traces"][0]["error"]


def test_iteration_cap_returns_fallback(client, auth_headers, fake_llm, monkeypatch):
    from app.settings import settings

    monkeypatch.setattr(settings, "chat_max_tool_iterations", 2)

    fake_llm["client"] = FakeLLMClient(
        [
            _tool("list_categories", {}, call_id="a"),
            _tool("list_categories", {}, call_id="b"),
        ]
    )
    body = client.post(
        "/chat", json={"message": "loop forever"}, headers=auth_headers
    ).json()
    assert "trouble" in body["message"].lower()


def test_llm_error_returns_safe_fallback(client, auth_headers, fake_llm):
    fake_llm["client"] = FakeLLMClient([LLMError("upstream 500")])
    resp = client.post("/chat", json={"message": "hi"}, headers=auth_headers)
    assert resp.status_code == 200
    assert "trouble" in resp.json()["message"].lower()
