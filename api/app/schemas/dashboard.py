from datetime import date

from app.schemas._base import StrictModel


class MonthlySpending(StrictModel):
    spent: int
    budget: int
    currency: str
    delta_vs_budget: int


class WeeklyBucket(StrictModel):
    week_number: int
    spent: int


class CategoryStat(StrictModel):
    id: int
    name: str
    emoji: str
    color: str
    spent: int
    budget: int
    transaction_count: int


class SubscriptionStat(StrictModel):
    id: int
    name: str
    amount: int
    billing_cycle: str
    next_charge_date: date
    color: str | None = None
    initials: str | None = None


class SubscriptionSummary(StrictModel):
    items: list[SubscriptionStat]
    total_monthly: int


class DashboardResponse(StrictModel):
    month: str
    monthly_spending: MonthlySpending
    weekly_spending: list[WeeklyBucket]
    categories: list[CategoryStat]
    subscriptions: SubscriptionSummary
