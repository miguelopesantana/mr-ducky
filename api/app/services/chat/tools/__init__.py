"""Tool registry for chat finance tools.

Each tool registers a JSON Schema for its arguments + a handler. The registry
is the single source of truth — orchestrator pulls schemas from here for the
LLM `tools` param, then dispatches tool_calls back through `execute`.

Tool handlers are responsible for their own privacy filtering: they decide
which fields leave the database. The orchestrator never sees a raw ORM row.
"""
from __future__ import annotations

import logging
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

from jsonschema import Draft202012Validator
from jsonschema import ValidationError as JsonSchemaValidationError
from sqlalchemy.orm import Session

log = logging.getLogger(__name__)

PENDING_ACTION_TTL_MINUTES = 10


@dataclass
class ChatContext:
    conversation_id: str


@dataclass
class PendingActionDraft:
    """Shape returned by write tools so the orchestrator can persist it."""

    tool_name: str
    args: dict[str, Any]
    summary: str

    def to_pending_action(self, conversation_id: str) -> dict[str, Any]:
        return {
            "id": uuid.uuid4().hex,
            "conversation_id": conversation_id,
            "tool_name": self.tool_name,
            "args": self.args,
            "summary": self.summary,
            "expires_at": datetime.now(timezone.utc)
            + timedelta(minutes=PENDING_ACTION_TTL_MINUTES),
        }


@dataclass
class ToolResult:
    """Tool return value passed back to the LLM (and surfaced in traces)."""

    payload: dict[str, Any] | None = None
    error: str | None = None
    pending_action: PendingActionDraft | None = None

    @classmethod
    def ok(
        cls,
        payload: dict[str, Any],
        *,
        pending_action: PendingActionDraft | None = None,
    ) -> "ToolResult":
        return cls(payload=payload, pending_action=pending_action)

    @classmethod
    def fail(cls, message: str) -> "ToolResult":
        return cls(error=message)

    def to_llm_content(self) -> str:
        """Serialize for inclusion in the tool response message."""
        import json

        if self.error is not None:
            return json.dumps({"error": self.error})
        return json.dumps(self.payload or {}, default=str)


Handler = Callable[[Session, dict[str, Any], ChatContext], ToolResult]


@dataclass
class ToolSpec:
    name: str
    description: str
    parameters: dict[str, Any]
    handler: Handler
    is_write: bool = False
    _validator: Draft202012Validator = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self._validator = Draft202012Validator(self.parameters)

    def validate(self, args: dict[str, Any]) -> None:
        try:
            self._validator.validate(args)
        except JsonSchemaValidationError as exc:
            raise ToolValidationError(str(exc.message)) from exc


class ToolValidationError(Exception):
    pass


REGISTRY: dict[str, ToolSpec] = {}


def register(spec: ToolSpec) -> ToolSpec:
    REGISTRY[spec.name] = spec
    return spec


def list_schemas() -> list[dict[str, Any]]:
    return [
        {"name": s.name, "description": s.description, "parameters": s.parameters}
        for s in REGISTRY.values()
    ]


def execute(
    name: str, args: dict[str, Any], db: Session, ctx: ChatContext
) -> ToolResult:
    spec = REGISTRY.get(name)
    if spec is None:
        return ToolResult.fail(f"unknown tool: {name}")
    try:
        spec.validate(args)
    except ToolValidationError as exc:
        return ToolResult.fail(f"invalid arguments: {exc}")
    try:
        return spec.handler(db, args, ctx)
    except Exception:  # noqa: BLE001
        log.exception("tool handler raised: %s", name)
        return ToolResult.fail("tool unavailable")


def _ensure_imports() -> None:
    """Import all tool modules so they self-register on package import."""
    from app.services.chat.tools import (  # noqa: F401
        budgets,
        categories,
        dashboard,
        subscriptions,
        transactions,
        writes,
    )


_ensure_imports()
