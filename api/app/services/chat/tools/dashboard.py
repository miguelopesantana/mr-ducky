"""get_dashboard tool: returns the same shape as GET /dashboard."""
from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.services.chat.tools import ChatContext, ToolResult, ToolSpec, register
from app.services.dashboard import build_dashboard
from app.services.months import current_month_str

_PARAMETERS = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "month": {
            "type": "string",
            "pattern": r"^\d{4}-(0[1-9]|1[0-2])$",
            "description": "Month in YYYY-MM. Defaults to current month.",
        }
    },
}


def _handler(db: Session, args: dict[str, Any], _ctx: ChatContext) -> ToolResult:
    month = args.get("month") or current_month_str()
    dash = build_dashboard(db, month)
    return ToolResult.ok(dash.model_dump(mode="json"))


register(
    ToolSpec(
        name="get_dashboard",
        description=(
            "Return the user's monthly finance dashboard: total spent vs budget, "
            "weekly spending buckets, per-category stats, and active subscriptions. "
            "Use this for high-level overviews."
        ),
        parameters=_PARAMETERS,
        handler=_handler,
    )
)
