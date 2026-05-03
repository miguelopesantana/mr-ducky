from datetime import datetime

from app.schemas._base import ORMModel


class NegotiationCallOut(ORMModel):
    id: str
    title: str
    description: str
    status: str
    current_amount_cents: int | None = None
    target_amount_cents: int | None = None
    competitor_offer: str | None = None
    scheduled_for: datetime | None = None
    completed_at: datetime | None = None
    result_summary: str | None = None
    saved_monthly_cents: int | None = None
    created_at: datetime


class NegotiationCallList(ORMModel):
    items: list[NegotiationCallOut]
