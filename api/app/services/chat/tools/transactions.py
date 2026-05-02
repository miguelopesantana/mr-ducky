"""query_transactions + top_merchants tools.

Both apply field whitelisting: notes, bank, internal IDs (beyond `id`) and
`category_id` raw FK are stripped. The model gets `categoryName` instead.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Category, Transaction
from app.services.chat.tools import ChatContext, ToolResult, ToolSpec, register
from app.services.months import parse_month

_QUERY_PARAMETERS = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "month": {
            "type": "string",
            "pattern": r"^\d{4}-(0[1-9]|1[0-2])$",
            "description": "Restrict to a single month (YYYY-MM).",
        },
        "categoryId": {"type": "integer", "minimum": 1},
        "merchantContains": {"type": "string", "minLength": 1, "maxLength": 64},
        "minAmountCents": {
            "type": "integer",
            "minimum": 0,
            "description": "Filter by absolute amount in cents (>=).",
        },
        "type": {"enum": ["expense", "income"]},
        "limit": {"type": "integer", "minimum": 1, "maximum": 50, "default": 20},
    },
}

_TOP_MERCHANTS_PARAMETERS = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "month": {"type": "string", "pattern": r"^\d{4}-(0[1-9]|1[0-2])$"},
        "categoryId": {"type": "integer", "minimum": 1},
        "limit": {"type": "integer", "minimum": 1, "maximum": 10, "default": 5},
    },
}


def _query_handler(
    db: Session, args: dict[str, Any], _ctx: ChatContext
) -> ToolResult:
    conds = []
    if month := args.get("month"):
        start, end, _ = parse_month(month)
        conds.append(Transaction.occurred_at >= start)
        conds.append(Transaction.occurred_at < end)
    if cat_id := args.get("categoryId"):
        conds.append(Transaction.category_id == cat_id)
    if merchant := args.get("merchantContains"):
        conds.append(Transaction.merchant_name.ilike(f"%{merchant}%"))
    if (min_cents := args.get("minAmountCents")) is not None:
        conds.append(func.abs(Transaction.amount) >= min_cents)
    if t := args.get("type"):
        conds.append(Transaction.type == t)

    limit = int(args.get("limit", 20))
    stmt = (
        select(Transaction)
        .where(*conds)
        .order_by(Transaction.occurred_at.desc(), Transaction.id.desc())
        .limit(limit)
    )
    rows = db.execute(stmt).scalars().all()

    cat_names: dict[int, str] = {}
    if rows:
        cat_ids = {r.category_id for r in rows if r.category_id is not None}
        if cat_ids:
            cats = db.execute(
                select(Category).where(Category.id.in_(cat_ids))
            ).scalars().all()
            cat_names = {c.id: c.name for c in cats}

    items = [
        {
            "id": r.id,
            "occurredAt": r.occurred_at.isoformat(),
            "amountCents": r.amount,
            "type": r.type,
            "merchantName": r.merchant_name,
            "categoryName": cat_names.get(r.category_id) if r.category_id else None,
        }
        for r in rows
    ]
    return ToolResult.ok({"items": items, "count": len(items), "limit": limit})


def _top_merchants_handler(
    db: Session, args: dict[str, Any], _ctx: ChatContext
) -> ToolResult:
    conds = [Transaction.type == "expense"]
    if month := args.get("month"):
        start, end, _ = parse_month(month)
        conds.append(Transaction.occurred_at >= start)
        conds.append(Transaction.occurred_at < end)
    if cat_id := args.get("categoryId"):
        conds.append(Transaction.category_id == cat_id)

    rows = db.execute(select(Transaction).where(*conds)).scalars().all()
    totals: dict[str, int] = defaultdict(int)
    counts: dict[str, int] = defaultdict(int)
    for r in rows:
        totals[r.merchant_name] += abs(r.amount)
        counts[r.merchant_name] += 1

    limit = int(args.get("limit", 5))
    ranked = sorted(totals.items(), key=lambda kv: (-kv[1], kv[0]))[:limit]
    return ToolResult.ok(
        {
            "merchants": [
                {
                    "merchantName": name,
                    "totalCents": total,
                    "count": counts[name],
                }
                for name, total in ranked
            ]
        }
    )


register(
    ToolSpec(
        name="query_transactions",
        description=(
            "Search the user's transactions with optional filters. Returns a row-limited "
            "list (max 50). Notes, bank, and other sensitive fields are not exposed. "
            "Prefer aggregate tools (top_merchants, category_spend_breakdown) when possible."
        ),
        parameters=_QUERY_PARAMETERS,
        handler=_query_handler,
    )
)

register(
    ToolSpec(
        name="top_merchants",
        description=(
            "Return the user's top expense merchants by total spent in a month, "
            "optionally scoped to a category."
        ),
        parameters=_TOP_MERCHANTS_PARAMETERS,
        handler=_top_merchants_handler,
    )
)
