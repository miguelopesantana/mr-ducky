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
