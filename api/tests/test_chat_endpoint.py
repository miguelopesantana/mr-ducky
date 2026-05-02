"""Endpoint-level tests for /chat: auth, conversation persistence, validation."""
from __future__ import annotations

import pytest

from app.deps import get_llm_client
from app.main import app
from app.services.chat.fake_llm import FakeLLMClient
from app.services.chat.llm import LLMResponse


def _final(text: str) -> LLMResponse:
    return LLMResponse(text=text, tool_calls=[], finish_reason="stop")


@pytest.fixture()
def fake_llm():
    """Install a FakeLLMClient and return it; per-test scripts via .queue setter."""
    state: dict = {"client": None}

    def _override():
        return state["client"]

    app.dependency_overrides[get_llm_client] = _override
    try:
        yield state
    finally:
        app.dependency_overrides.pop(get_llm_client, None)


def test_chat_requires_auth(client):
    resp = client.post("/chat", json={"message": "hi"})
    assert resp.status_code == 401


def test_chat_happy_path_creates_conversation(client, auth_headers, fake_llm):
    fake_llm["client"] = FakeLLMClient([_final("Hello!")])

    resp = client.post("/chat", json={"message": "hi there"}, headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["message"] == "Hello!"
    assert isinstance(body["conversationId"], str) and len(body["conversationId"]) == 32
    assert body["traces"] == []
    assert body["pendingActions"] == []

    # Conversation persisted, retrievable.
    detail = client.get(
        f"/chat/conversations/{body['conversationId']}", headers=auth_headers
    ).json()
    roles = [m["role"] for m in detail["messages"]]
    assert roles == ["user", "assistant"]
    assert detail["messages"][0]["content"] == "hi there"
    assert detail["messages"][1]["content"] == "Hello!"


def test_chat_resumes_existing_conversation(client, auth_headers, fake_llm):
    fake_llm["client"] = FakeLLMClient([_final("first"), _final("second")])

    first = client.post(
        "/chat", json={"message": "round one"}, headers=auth_headers
    ).json()
    conv_id = first["conversationId"]

    second = client.post(
        "/chat",
        json={"message": "round two", "conversationId": conv_id},
        headers=auth_headers,
    ).json()
    assert second["conversationId"] == conv_id

    detail = client.get(
        f"/chat/conversations/{conv_id}", headers=auth_headers
    ).json()
    assert [m["role"] for m in detail["messages"]] == [
        "user",
        "assistant",
        "user",
        "assistant",
    ]


def test_chat_validation_empty_and_too_long(client, auth_headers, fake_llm):
    fake_llm["client"] = FakeLLMClient([_final("ok")])

    assert (
        client.post("/chat", json={"message": ""}, headers=auth_headers).status_code
        == 422
    )
    assert (
        client.post(
            "/chat", json={"message": "x" * 5000}, headers=auth_headers
        ).status_code
        == 422
    )


def test_list_and_delete_conversation(client, auth_headers, fake_llm):
    fake_llm["client"] = FakeLLMClient([_final("hi")])
    body = client.post(
        "/chat", json={"message": "hello"}, headers=auth_headers
    ).json()
    conv_id = body["conversationId"]

    listing = client.get("/chat/conversations", headers=auth_headers).json()
    assert any(c["id"] == conv_id for c in listing["items"])
    assert listing["items"][0]["lastUserMessage"] == "hello"

    assert (
        client.delete(
            f"/chat/conversations/{conv_id}", headers=auth_headers
        ).status_code
        == 204
    )
    assert (
        client.get(
            f"/chat/conversations/{conv_id}", headers=auth_headers
        ).status_code
        == 404
    )
