from collections import defaultdict
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Budget, Category, Subscription, Transaction
from app.schemas.dashboard import (
    CategoryStat,
    DashboardResponse,
    MonthlySpending,
    SubscriptionStat,
    SubscriptionSummary,
    WeeklyBucket,
)
from app.services.months import parse_month
from app.services.subscriptions import monthly_cost
from app.settings import settings


def build_dashboard(db: Session, month: str) -> DashboardResponse:
    start, end, normalized = parse_month(month)

    txns = (
        db.execute(
            select(Transaction).where(
                Transaction.occurred_at >= start,
                Transaction.occurred_at < end,
            )
        )
        .scalars()
        .all()
    )

    expense_total = sum(abs(t.amount) for t in txns if t.type == "expense")

    budget_row = db.execute(
        select(Budget).where(Budget.month == normalized)
    ).scalar_one_or_none()
    budget_total = budget_row.total_budget if budget_row else 0

    monthly = MonthlySpending(
        spent=expense_total,
        budget=budget_total,
        currency=settings.currency,
        delta_vs_budget=expense_total - budget_total,
    )

    weekly = _weekly_buckets(txns, start, end)

    categories_data = _category_stats(db, txns)

    subs = (
        db.execute(
            select(Subscription)
            .where(Subscription.is_active.is_(True))
            .order_by(Subscription.next_charge_date)
        )
        .scalars()
        .all()
    )
    sub_items = [
        SubscriptionStat(
            id=s.id,
            name=s.name,
            amount=s.amount,
            billing_cycle=s.billing_cycle,
            next_charge_date=s.next_charge_date,
        )
        for s in subs
    ]
    total_monthly = sum(monthly_cost(s) for s in subs)

    return DashboardResponse(
        month=normalized,
        monthly_spending=monthly,
        weekly_spending=weekly,
        categories=categories_data,
        subscriptions=SubscriptionSummary(items=sub_items, total_monthly=total_monthly),
    )


def _weekly_buckets(
    txns: list[Transaction], start: date, end: date
) -> list[WeeklyBucket]:
    """Bucket expense totals by ISO week, numbered 1..N across the requested month."""
    iso_keys: list[tuple[int, int]] = []
    seen = set()
    cursor = start
    while cursor < end:
        iy, iw, _ = cursor.isocalendar()
        key = (iy, iw)
        if key not in seen:
            seen.add(key)
            iso_keys.append(key)
        cursor = date.fromordinal(cursor.toordinal() + 1)

    by_key: dict[tuple[int, int], int] = defaultdict(int)
    for t in txns:
        if t.type != "expense":
            continue
        iy, iw, _ = t.occurred_at.isocalendar()
        by_key[(iy, iw)] += abs(t.amount)

    return [
        WeeklyBucket(week_number=i + 1, spent=by_key.get(key, 0))
        for i, key in enumerate(iso_keys)
    ]


def _category_stats(
    db: Session, txns: list[Transaction]
) -> list[CategoryStat]:
    spent_by_cat: dict[int, int] = defaultdict(int)
    count_by_cat: dict[int, int] = defaultdict(int)
    for t in txns:
        if t.type != "expense" or t.category_id is None:
            continue
        spent_by_cat[t.category_id] += abs(t.amount)
        count_by_cat[t.category_id] += 1

    cats = (
        db.execute(select(Category).order_by(Category.name))
        .scalars()
        .all()
    )

    stats = [
        CategoryStat(
            id=c.id,
            name=c.name,
            emoji=c.emoji,
            color=c.color,
            spent=spent_by_cat.get(c.id, 0),
            budget=c.monthly_budget,
            transaction_count=count_by_cat.get(c.id, 0),
        )
        for c in cats
    ]
    stats.sort(key=lambda s: (-s.spent, s.name))
    return stats
