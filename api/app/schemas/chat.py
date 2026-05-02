from datetime import datetime
from typing import Any

from pydantic import Field

from app.schemas._base import ORMModel, StrictModel
from app.settings import settings


class ChatRequest(StrictModel):
    message: str = Field(min_length=1, max_length=settings.chat_max_message_chars)
    conversation_id: str | None = None


class ToolTrace(ORMModel):
    name: str
    input: dict[str, Any]
    output: dict[str, Any] | None = None
    error: str | None = None
    duration_ms: int


class PendingActionOut(ORMModel):
    id: str
    tool: str
    summary: str
    args: dict[str, Any]
    expires_at: datetime


class ChatResponse(ORMModel):
    message: str
    conversation_id: str
    traces: list[ToolTrace] = []
    pending_actions: list[PendingActionOut] = []


class ConversationSummary(ORMModel):
    id: str
    title: str | None = None
    updated_at: datetime
    last_user_message: str | None = None


class ConversationList(ORMModel):
    items: list[ConversationSummary]


class StoredMessage(ORMModel):
    id: int
    role: str
    content: str | None = None
    tool_name: str | None = None
    pending_action_id: str | None = None
    created_at: datetime


class ConversationDetail(ORMModel):
    id: str
    title: str | None = None
    created_at: datetime
    updated_at: datetime
    messages: list[StoredMessage]


class ActionConfirmation(ORMModel):
    id: str
    status: str
    result: dict[str, Any] | None = None
