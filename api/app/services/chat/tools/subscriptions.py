"""list_subscriptions tool."""
from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Subscription
from app.services.chat.tools import ChatContext, ToolResult, ToolSpec, register
from app.services.subscriptions import monthly_cost, total_monthly_cost

_PARAMETERS = {"type": "object", "additionalProperties": False, "properties": {}}


def _handler(db: Session, _args: dict[str, Any], _ctx: ChatContext) -> ToolResult:
    rows = (
        db.execute(
            select(Subscription)
            .where(Subscription.is_active.is_(True))
            .order_by(Subscription.next_charge_date)
        )
        .scalars()
        .all()
    )
    items = [
        {
            "id": s.id,
            "name": s.name,
            "amountCents": s.amount,
            "billingCycle": s.billing_cycle,
            "nextChargeDate": s.next_charge_date.isoformat(),
            "monthlyCostCents": monthly_cost(s),
        }
        for s in rows
    ]
    return ToolResult.ok(
        {"subscriptions": items, "totalMonthlyCents": total_monthly_cost(rows)}
    )


register(
    ToolSpec(
        name="list_subscriptions",
        description=(
            "List the user's active subscriptions with normalized monthly cost "
            "and next charge date."
        ),
        parameters=_PARAMETERS,
        handler=_handler,
    )
)
