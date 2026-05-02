from datetime import date, timedelta

from app.db.models import Subscription


def monthly_cost(sub: Subscription) -> int:
    """Normalize a subscription's amount to a monthly figure (integer cents)."""
    if sub.billing_cycle == "monthly":
        return sub.amount
    if sub.billing_cycle == "yearly":
        return round(sub.amount / 12)
    if sub.billing_cycle == "weekly":
        return round(sub.amount * 52 / 12)
    return 0


def total_monthly_cost(subs: list[Subscription]) -> int:
    return sum(monthly_cost(s) for s in subs if s.is_active)


def previous_charge_date(sub: Subscription) -> date | None:
    if sub.billing_cycle == "monthly":
        year = sub.next_charge_date.year
        month = sub.next_charge_date.month - 1
        if month == 0:
            year -= 1
            month = 12
        day = min(sub.next_charge_date.day, _days_in_month(year, month))
        return date(year, month, day)

    if sub.billing_cycle == "yearly":
        year = sub.next_charge_date.year - 1
        day = min(sub.next_charge_date.day, _days_in_month(year, sub.next_charge_date.month))
        return date(year, sub.next_charge_date.month, day)

    if sub.billing_cycle == "weekly":
        return sub.next_charge_date - timedelta(days=7)

    return None


def billed_this_month(sub: Subscription, today: date | None = None) -> bool:
    previous = previous_charge_date(sub)
    if previous is None:
        return False
    current = today or date.today()
    return previous.year == current.year and previous.month == current.month


def _days_in_month(year: int, month: int) -> int:
    if month == 12:
        return 31
    return (date(year, month + 1, 1) - timedelta(days=1)).day
