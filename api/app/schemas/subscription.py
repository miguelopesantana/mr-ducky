from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import Field

from app.schemas._base import ORMModel, StrictModel

BillingCycle = Literal["monthly", "yearly", "weekly"]
NameField = Annotated[str, Field(min_length=1, max_length=128)]
LogoField = Annotated[str, Field(max_length=2048)]
AmountField = Annotated[int, Field(gt=0)]
CurrencyField = Annotated[str, Field(min_length=3, max_length=3)]


class SubscriptionCreate(StrictModel):
    name: NameField
    logo_url: LogoField | None = None
    amount: AmountField
    currency: CurrencyField = "EUR"
    billing_cycle: BillingCycle
    next_charge_date: date


class SubscriptionUpdate(StrictModel):
    name: NameField | None = None
    logo_url: LogoField | None = None
    amount: AmountField | None = None
    currency: CurrencyField | None = None
    billing_cycle: BillingCycle | None = None
    next_charge_date: date | None = None
    is_active: bool | None = None


class SubscriptionOut(ORMModel):
    id: int
    name: str
    logo_url: str | None
    amount: int
    currency: str
    billing_cycle: BillingCycle
    next_charge_date: date
    is_active: bool
    created_at: datetime


class SubscriptionList(StrictModel):
    items: list[SubscriptionOut]
    total_monthly_cost: int
