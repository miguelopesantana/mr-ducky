"""category_spend_breakdown tool: spent vs budget per category for a month."""
from __future__ import annotations

from collections import defaultdict
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Budget, Category, Transaction
from app.services.chat.tools import ChatContext, ToolResult, ToolSpec, register
from app.services.months import current_month_str, parse_month

_PARAMETERS = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "month": {"type": "string", "pattern": r"^\d{4}-(0[1-9]|1[0-2])$"},
    },
}


def _handler(db: Session, args: dict[str, Any], _ctx: ChatContext) -> ToolResult:
    month = args.get("month") or current_month_str()
    start, end, normalized = parse_month(month)

    txns = (
        db.execute(
            select(Transaction).where(
                Transaction.occurred_at >= start,
                Transaction.occurred_at < end,
                Transaction.type == "expense",
            )
        )
        .scalars()
        .all()
    )

    spent: dict[int | None, int] = defaultdict(int)
    counts: dict[int | None, int] = defaultdict(int)
    for t in txns:
        spent[t.category_id] += abs(t.amount)
        counts[t.category_id] += 1

    cats = db.execute(select(Category).order_by(Category.name)).scalars().all()
    rows = [
        {
            "categoryId": c.id,
            "name": c.name,
            "spentCents": spent.get(c.id, 0),
            "budgetCents": c.monthly_budget,
            "deltaCents": spent.get(c.id, 0) - c.monthly_budget,
            "transactionCount": counts.get(c.id, 0),
        }
        for c in cats
    ]
    rows.sort(key=lambda r: (-r["spentCents"], r["name"]))

    total_spent = sum(r["spentCents"] for r in rows) + spent.get(None, 0)
    total_budget_row = db.execute(
        select(Budget).where(Budget.month == normalized)
    ).scalar_one_or_none()
    total_budget = total_budget_row.total_budget if total_budget_row else 0

    return ToolResult.ok(
        {
            "month": normalized,
            "categories": rows,
            "uncategorizedSpentCents": spent.get(None, 0),
            "totalSpentCents": total_spent,
            "totalBudgetCents": total_budget,
        }
    )


register(
    ToolSpec(
        name="category_spend_breakdown",
        description=(
            "Per-category spending versus monthly budget for a given month. "
            "Best tool for 'how am I doing on my budget' questions."
        ),
        parameters=_PARAMETERS,
        handler=_handler,
    )
)
