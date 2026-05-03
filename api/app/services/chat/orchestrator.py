"""Chat orchestrator: tool-loop runner that talks to LLMClient + tool registry.

Loop invariants:
- Hard cap on tool iterations (settings.chat_max_tool_iterations).
- LLM errors and tool exceptions are caught and converted to a safe fallback;
  the endpoint always returns 200, never bubbles upstream provider errors.
- Every tool call is recorded in `traces`. Every pending action (write tool)
  is persisted to the pending_actions table and surfaced in the response.
"""
from __future__ import annotations

import logging
import uuid
from collections.abc import Iterator
from dataclasses import dataclass, field
from datetime import datetime, timezone
from time import monotonic
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import ChatMessage, Conversation, PendingAction
from app.services.chat.llm import (
    LLMClient,
    LLMError,
    LLMResponse,
    Message,
    StreamDone,
    TextDelta,
    ToolCall,
)
from app.services.chat.system_prompt import render_system_prompt
from app.services.chat.tools import (
    REGISTRY,
    ChatContext,
    execute,
    list_schemas,
)
from app.settings import settings

log = logging.getLogger(__name__)

_FALLBACK_TEXT = (
    "I had trouble looking that up. Try rephrasing, or ask about a specific category or month."
)


@dataclass
class ToolTraceDTO:
    name: str
    input: dict[str, Any]
    output: dict[str, Any] | None = None
    error: str | None = None
    duration_ms: int = 0


@dataclass
class PendingActionDTO:
    id: str
    tool: str
    summary: str
    args: dict[str, Any]
    expires_at: datetime


@dataclass
class ChatTurnResult:
    message: str
    conversation_id: str
    traces: list[ToolTraceDTO] = field(default_factory=list)
    pending_actions: list[PendingActionDTO] = field(default_factory=list)


# ---- public entrypoint -----------------------------------------------------


def run_turn(
    db: Session,
    llm: LLMClient,
    *,
    conversation_id: str | None,
    user_message: str,
) -> ChatTurnResult:
    conv = _ensure_conversation(db, conversation_id)
    _persist_message(db, conv.id, role="user", content=user_message)
    if conv.title is None:
        conv.title = user_message[:80]
    db.commit()

    history_msgs = _load_recent_messages(db, conv.id, limit=settings.chat_history_window)
    messages = _to_llm_messages(history_msgs)

    traces: list[ToolTraceDTO] = []
    pending_actions: list[PendingActionDTO] = []
    system = render_system_prompt(owner=settings.owner_name, currency=settings.currency)
    tools = list_schemas()

    for _ in range(settings.chat_max_tool_iterations):
        try:
            resp = llm.complete(system=system, messages=messages, tools=tools)
        except LLMError as exc:
            log.warning("LLM error during chat turn: %s", exc)
            return _fallback(db, conv.id, traces, pending_actions)

        if not resp.tool_calls:
            text = (resp.text or "").strip() or _FALLBACK_TEXT
            _persist_message(db, conv.id, role="assistant", content=text)
            db.commit()
            return ChatTurnResult(
                message=text,
                conversation_id=conv.id,
                traces=traces,
                pending_actions=pending_actions,
            )

        # The model wants to call tools — record the assistant turn and execute.
        _persist_message(
            db,
            conv.id,
            role="assistant",
            content=resp.text,
            tool_calls=_serialize_tool_calls(resp.tool_calls),
        )
        messages.append(_assistant_with_tool_calls(resp))

        for tc in resp.tool_calls:
            t0 = monotonic()
            result = execute(tc.name, tc.arguments, db, ChatContext(conv.id))
            duration_ms = int((monotonic() - t0) * 1000)

            pending_dto: PendingActionDTO | None = None
            if result.pending_action is not None:
                pa_row = _persist_pending_action(db, result.pending_action, conv.id)
                pending_dto = PendingActionDTO(
                    id=pa_row.id,
                    tool=pa_row.tool_name,
                    summary=pa_row.summary,
                    args=pa_row.args,
                    expires_at=pa_row.expires_at,
                )
                pending_actions.append(pending_dto)

            traces.append(
                ToolTraceDTO(
                    name=tc.name,
                    input=tc.arguments,
                    output=result.payload,
                    error=result.error,
                    duration_ms=duration_ms,
                )
            )

            tool_content = result.to_llm_content()
            _persist_message(
                db,
                conv.id,
                role="tool",
                content=tool_content,
                tool_name=tc.name,
                tool_call_id=tc.id,
                pending_action_id=pending_dto.id if pending_dto else None,
            )
            messages.append(
                Message(role="tool", content=tool_content, tool_call_id=tc.id)
            )
        db.commit()

    log.warning("chat tool loop hit iteration cap (conversation=%s)", conv.id)
    return _fallback(db, conv.id, traces, pending_actions)


# ---- helpers ---------------------------------------------------------------


def _ensure_conversation(db: Session, conversation_id: str | None) -> Conversation:
    if conversation_id:
        conv = db.get(Conversation, conversation_id)
        if conv is not None:
            return conv
    conv = Conversation(id=uuid.uuid4().hex)
    db.add(conv)
    db.flush()
    return conv


def _persist_message(
    db: Session,
    conversation_id: str,
    *,
    role: str,
    content: str | None,
    tool_calls: list | None = None,
    tool_name: str | None = None,
    tool_call_id: str | None = None,
    pending_action_id: str | None = None,
) -> None:
    msg = ChatMessage(
        conversation_id=conversation_id,
        role=role,
        content=content,
        tool_calls=tool_calls,
        tool_name=tool_name,
        tool_call_id=tool_call_id,
        pending_action_id=pending_action_id,
    )
    db.add(msg)
    db.flush()


def _load_recent_messages(
    db: Session, conversation_id: str, *, limit: int
) -> list[ChatMessage]:
    """Return the last `limit` messages in chronological order."""
    rows = (
        db.execute(
            select(ChatMessage)
            .where(ChatMessage.conversation_id == conversation_id)
            .order_by(ChatMessage.id.desc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
    return list(reversed(rows))


def _to_llm_messages(rows: list[ChatMessage]) -> list[Message]:
    # The history window can clip a multi-step turn (assistant tool_calls + N
    # tool replies) and leave dangling tool / tool_calls messages at the head.
    # OpenAI rejects those: a tool message must follow an assistant tool_calls,
    # and a tool_calls assistant should be preceded by a user message. Trim to
    # the first user row so we always start at a clean turn boundary.
    start = next((i for i, r in enumerate(rows) if r.role == "user"), len(rows))
    out: list[Message] = []
    for r in rows[start:]:
        if r.role == "system_note":
            continue
        if r.role == "tool":
            out.append(
                Message(
                    role="tool",
                    content=r.content,
                    tool_call_id=r.tool_call_id,
                )
            )
            continue
        if r.role == "assistant" and r.tool_calls:
            out.append(
                Message(
                    role="assistant",
                    content=r.content,
                    tool_calls=[
                        ToolCall(id=tc["id"], name=tc["name"], arguments=tc["arguments"])
                        for tc in r.tool_calls
                    ],
                )
            )
            continue
        out.append(Message(role=r.role, content=r.content or ""))  # type: ignore[arg-type]
    return out


def _assistant_with_tool_calls(resp: LLMResponse) -> Message:
    return Message(role="assistant", content=resp.text, tool_calls=list(resp.tool_calls))


def _serialize_tool_calls(tool_calls: list[ToolCall]) -> list[dict[str, Any]]:
    return [{"id": tc.id, "name": tc.name, "arguments": tc.arguments} for tc in tool_calls]


def _persist_pending_action(
    db: Session, draft, conversation_id: str
) -> PendingAction:
    payload = draft.to_pending_action(conversation_id)
    row = PendingAction(**payload)
    db.add(row)
    db.flush()
    return row


def _fallback(
    db: Session,
    conversation_id: str,
    traces: list[ToolTraceDTO],
    pending_actions: list[PendingActionDTO],
) -> ChatTurnResult:
    _persist_message(db, conversation_id, role="assistant", content=_FALLBACK_TEXT)
    db.commit()
    return ChatTurnResult(
        message=_FALLBACK_TEXT,
        conversation_id=conversation_id,
        traces=traces,
        pending_actions=pending_actions,
    )


def expire_pending_action(action: PendingAction) -> bool:
    """Mark expired if past expires_at. Returns True if it just expired."""
    if action.status != "pending":
        return False
    expires_at = action.expires_at
    if expires_at is None:
        return False
    # SQLite (used in tests) round-trips datetimes as naive; treat them as UTC.
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        action.status = "expired"
        return True
    return False


# ---- streaming entrypoint --------------------------------------------------


@dataclass
class StreamTokenEvent:
    text: str


@dataclass
class StreamToolStartEvent:
    name: str
    args: dict[str, Any]


@dataclass
class StreamToolEndEvent:
    name: str
    output: dict[str, Any] | None
    error: str | None
    duration_ms: int


@dataclass
class StreamPendingActionEvent:
    action: PendingActionDTO


@dataclass
class StreamDoneEvent:
    message: str
    conversation_id: str


@dataclass
class StreamErrorEvent:
    message: str
    conversation_id: str


StreamTurnEvent = (
    StreamTokenEvent
    | StreamToolStartEvent
    | StreamToolEndEvent
    | StreamPendingActionEvent
    | StreamDoneEvent
    | StreamErrorEvent
)


def run_turn_stream(
    db: Session,
    llm: LLMClient,
    *,
    conversation_id: str | None,
    user_message: str,
) -> Iterator[StreamTurnEvent]:
    """Streaming variant of `run_turn`. Yields events as the turn unfolds.

    The visible reply is streamed via StreamTokenEvent. Tool calls produce
    StreamToolStart/End events. The terminating StreamDoneEvent carries the
    full final message + conversation_id. On unrecoverable failure, a
    StreamErrorEvent is emitted instead and persistence still records the
    fallback assistant turn so the conversation log stays consistent.
    """
    conv = _ensure_conversation(db, conversation_id)
    _persist_message(db, conv.id, role="user", content=user_message)
    if conv.title is None:
        conv.title = user_message[:80]
    db.commit()

    history_msgs = _load_recent_messages(
        db, conv.id, limit=settings.chat_history_window
    )
    messages = _to_llm_messages(history_msgs)
    system = render_system_prompt(owner=settings.owner_name, currency=settings.currency)
    tools = list_schemas()

    for _ in range(settings.chat_max_tool_iterations):
        text_parts: list[str] = []
        final: LLMResponse | None = None
        try:
            for ev in llm.stream(system=system, messages=messages, tools=tools):
                if isinstance(ev, TextDelta):
                    text_parts.append(ev.text)
                    yield StreamTokenEvent(text=ev.text)
                elif isinstance(ev, StreamDone):
                    final = ev.response
        except LLMError as exc:
            log.warning("LLM error during streaming chat turn: %s", exc)
            _persist_message(db, conv.id, role="assistant", content=_FALLBACK_TEXT)
            db.commit()
            yield StreamErrorEvent(
                message=_FALLBACK_TEXT, conversation_id=conv.id
            )
            return

        if final is None:
            log.warning("stream ended without a StreamDone event")
            _persist_message(db, conv.id, role="assistant", content=_FALLBACK_TEXT)
            db.commit()
            yield StreamErrorEvent(
                message=_FALLBACK_TEXT, conversation_id=conv.id
            )
            return

        if not final.tool_calls:
            text = ("".join(text_parts) or final.text or "").strip() or _FALLBACK_TEXT
            _persist_message(db, conv.id, role="assistant", content=text)
            db.commit()
            yield StreamDoneEvent(message=text, conversation_id=conv.id)
            return

        # Tool calls: persist the assistant turn and execute each tool.
        _persist_message(
            db,
            conv.id,
            role="assistant",
            content=final.text,
            tool_calls=_serialize_tool_calls(final.tool_calls),
        )
        messages.append(_assistant_with_tool_calls(final))

        for tc in final.tool_calls:
            yield StreamToolStartEvent(name=tc.name, args=tc.arguments)
            t0 = monotonic()
            result = execute(tc.name, tc.arguments, db, ChatContext(conv.id))
            duration_ms = int((monotonic() - t0) * 1000)

            pending_dto: PendingActionDTO | None = None
            if result.pending_action is not None:
                pa_row = _persist_pending_action(db, result.pending_action, conv.id)
                pending_dto = PendingActionDTO(
                    id=pa_row.id,
                    tool=pa_row.tool_name,
                    summary=pa_row.summary,
                    args=pa_row.args,
                    expires_at=pa_row.expires_at,
                )

            yield StreamToolEndEvent(
                name=tc.name,
                output=result.payload,
                error=result.error,
                duration_ms=duration_ms,
            )
            if pending_dto is not None:
                yield StreamPendingActionEvent(action=pending_dto)

            tool_content = result.to_llm_content()
            _persist_message(
                db,
                conv.id,
                role="tool",
                content=tool_content,
                tool_name=tc.name,
                tool_call_id=tc.id,
                pending_action_id=pending_dto.id if pending_dto else None,
            )
            messages.append(
                Message(role="tool", content=tool_content, tool_call_id=tc.id)
            )
        db.commit()

    log.warning("chat tool loop hit iteration cap (conversation=%s)", conv.id)
    _persist_message(db, conv.id, role="assistant", content=_FALLBACK_TEXT)
    db.commit()
    yield StreamErrorEvent(message=_FALLBACK_TEXT, conversation_id=conv.id)


# Sanity guard — re-export so callers don't have to import REGISTRY directly.
__all__ = [
    "ChatTurnResult",
    "ToolTraceDTO",
    "PendingActionDTO",
    "REGISTRY",
    "StreamDoneEvent",
    "StreamErrorEvent",
    "StreamPendingActionEvent",
    "StreamTokenEvent",
    "StreamToolEndEvent",
    "StreamToolStartEvent",
    "StreamTurnEvent",
    "expire_pending_action",
    "run_turn",
    "run_turn_stream",
]
