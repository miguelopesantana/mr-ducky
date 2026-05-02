"""Write tools: propose mutations without executing them.

Each propose_* tool returns a PendingActionDraft. The orchestrator persists
the draft to the pending_actions table and surfaces it in the chat response;
the UI shows a confirm button that hits POST /chat/actions/{id}/confirm,
which in turn dispatches to the matching `_apply_*` function below.
"""
from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Budget, Category
from app.services.chat.tools import (
    ChatContext,
    PendingActionDraft,
    ToolResult,
    ToolSpec,
    register,
)
from app.services.months import parse_month
from app.settings import settings


def _format_amount(cents: int) -> str:
    return f"{settings.currency} {cents / 100:.2f}"


_SET_CATEGORY_BUDGET_PARAMETERS = {
    "type": "object",
    "additionalProperties": False,
    "required": ["categoryId", "amountCents"],
    "properties": {
        "categoryId": {"type": "integer", "minimum": 1},
        "amountCents": {"type": "integer", "minimum": 0, "maximum": 100_000_000},
    },
}

_SET_TOTAL_BUDGET_PARAMETERS = {
    "type": "object",
    "additionalProperties": False,
    "required": ["month", "amountCents"],
    "properties": {
        "month": {"type": "string", "pattern": r"^\d{4}-(0[1-9]|1[0-2])$"},
        "amountCents": {"type": "integer", "minimum": 0, "maximum": 1_000_000_000},
    },
}


def _propose_set_category_budget(
    db: Session, args: dict[str, Any], _ctx: ChatContext
) -> ToolResult:
    cat = db.get(Category, args["categoryId"])
    if cat is None:
        return ToolResult.fail("unknown category")

    proposed = int(args["amountCents"])
    summary = (
        f"Set {cat.name} monthly budget from {_format_amount(cat.monthly_budget)} "
        f"to {_format_amount(proposed)}"
    )
    return ToolResult.ok(
        {
            "summary": summary,
            "currentCents": cat.monthly_budget,
            "proposedCents": proposed,
            "categoryName": cat.name,
            "requiresConfirmation": True,
        },
        pending_action=PendingActionDraft(
            tool_name="propose_set_category_budget",
            args={"categoryId": cat.id, "amountCents": proposed},
            summary=summary,
        ),
    )


def _propose_set_total_budget(
    db: Session, args: dict[str, Any], _ctx: ChatContext
) -> ToolResult:
    _, _, normalized = parse_month(args["month"])
    proposed = int(args["amountCents"])
    existing = db.execute(
        select(Budget).where(Budget.month == normalized)
    ).scalar_one_or_none()
    current = existing.total_budget if existing else 0
    summary = (
        f"Set total budget for {normalized} from {_format_amount(current)} "
        f"to {_format_amount(proposed)}"
    )
    return ToolResult.ok(
        {
            "summary": summary,
            "month": normalized,
            "currentCents": current,
            "proposedCents": proposed,
            "requiresConfirmation": True,
        },
        pending_action=PendingActionDraft(
            tool_name="propose_set_total_budget",
            args={"month": normalized, "amountCents": proposed},
            summary=summary,
        ),
    )


# ---- apply functions (called from POST /chat/actions/{id}/confirm) ----------


def apply_action(db: Session, tool_name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Dispatch a confirmed pending action to its mutation handler."""
    if tool_name == "propose_set_category_budget":
        return _apply_set_category_budget(db, args)
    if tool_name == "propose_set_total_budget":
        return _apply_set_total_budget(db, args)
    raise ValueError(f"unknown write tool: {tool_name}")


def _apply_set_category_budget(db: Session, args: dict[str, Any]) -> dict[str, Any]:
    cat = db.get(Category, args["categoryId"])
    if cat is None:
        raise ValueError("category not found")
    cat.monthly_budget = int(args["amountCents"])
    db.commit()
    db.refresh(cat)
    return {"categoryId": cat.id, "name": cat.name, "monthlyBudgetCents": cat.monthly_budget}


def _apply_set_total_budget(db: Session, args: dict[str, Any]) -> dict[str, Any]:
    _, _, normalized = parse_month(args["month"])
    proposed = int(args["amountCents"])
    row = db.execute(
        select(Budget).where(Budget.month == normalized)
    ).scalar_one_or_none()
    if row is None:
        row = Budget(month=normalized, total_budget=proposed)
        db.add(row)
    else:
        row.total_budget = proposed
    db.commit()
    db.refresh(row)
    return {"month": row.month, "totalBudgetCents": row.total_budget}


register(
    ToolSpec(
        name="propose_set_category_budget",
        description=(
            "Propose a new monthly budget for a single category. Does NOT apply the "
            "change — the user must confirm via the UI. Use when the user asks to "
            "increase/decrease a category budget."
        ),
        parameters=_SET_CATEGORY_BUDGET_PARAMETERS,
        handler=_propose_set_category_budget,
        is_write=True,
    )
)

register(
    ToolSpec(
        name="propose_set_total_budget",
        description=(
            "Propose a new total monthly budget for a given month. Does NOT apply "
            "the change — the user must confirm via the UI."
        ),
        parameters=_SET_TOTAL_BUDGET_PARAMETERS,
        handler=_propose_set_total_budget,
        is_write=True,
    )
)
