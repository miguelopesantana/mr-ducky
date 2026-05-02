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


def previous_charge_date(
    sub: Subscription, today: date | None = None
) -> date | None:
    """Return the most recent past charge date, or None if the cycle math points
    to a future date (i.e. the sub hasn't been charged yet)."""
    candidate: date | None
    if sub.billing_cycle == "monthly":
        year = sub.next_charge_date.year
        month = sub.next_charge_date.month - 1
        if month == 0:
            year -= 1
            month = 12
        day = min(sub.next_charge_date.day, _days_in_month(year, month))
        candidate = date(year, month, day)
    elif sub.billing_cycle == "yearly":
        year = sub.next_charge_date.year - 1
        day = min(sub.next_charge_date.day, _days_in_month(year, sub.next_charge_date.month))
        candidate = date(year, sub.next_charge_date.month, day)
    elif sub.billing_cycle == "weekly":
        candidate = sub.next_charge_date - timedelta(days=7)
    else:
        return None

    current = today or date.today()
    if candidate > current:
        return None
    return candidate


def billed_this_month(sub: Subscription, today: date | None = None) -> bool:
    previous = previous_charge_date(sub, today)
    if previous is None:
        return False
    current = today or date.today()
    return previous.year == current.year and previous.month == current.month


def _days_in_month(year: int, month: int) -> int:
    if month == 12:
        return 31
    return (date(year, month + 1, 1) - timedelta(days=1)).day
