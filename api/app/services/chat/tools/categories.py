"""list_categories tool."""
from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Category
from app.services.chat.tools import ChatContext, ToolResult, ToolSpec, register

_PARAMETERS = {"type": "object", "additionalProperties": False, "properties": {}}


def _handler(db: Session, _args: dict[str, Any], _ctx: ChatContext) -> ToolResult:
    rows = db.execute(select(Category).order_by(Category.name)).scalars().all()
    return ToolResult.ok(
        {
            "categories": [
                {
                    "id": c.id,
                    "name": c.name,
                    "emoji": c.emoji,
                    "monthlyBudgetCents": c.monthly_budget,
                }
                for c in rows
            ]
        }
    )


register(
    ToolSpec(
        name="list_categories",
        description="List the user's spending categories with their monthly budgets.",
        parameters=_PARAMETERS,
        handler=_handler,
    )
)
