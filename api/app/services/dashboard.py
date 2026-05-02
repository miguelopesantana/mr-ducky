from collections import defaultdict
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Budget, Category, Subscription, Transaction
from app.schemas.dashboard import (
    CategoryStat,
    DashboardResponse,
    MonthlySpending,
    RollingWeeklyResponse,
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
            color=s.color,
            initials=s.initials,
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
    week_starts: dict[tuple[int, int], date] = {}
    seen = set()
    cursor = start
    while cursor < end:
        iy, iw, _ = cursor.isocalendar()
        key = (iy, iw)
        if key not in seen:
            seen.add(key)
            iso_keys.append(key)
            week_starts[key] = cursor
        cursor = date.fromordinal(cursor.toordinal() + 1)

    by_key: dict[tuple[int, int], int] = defaultdict(int)
    for t in txns:
        if t.type != "expense":
            continue
        iy, iw, _ = t.occurred_at.isocalendar()
        by_key[(iy, iw)] += abs(t.amount)

    return [
        WeeklyBucket(
            week_number=i + 1,
            week_start=week_starts[key],
            spent=by_key.get(key, 0),
        )
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


def build_rolling_weekly(db: Session, weeks: int = 4) -> RollingWeeklyResponse:
    """Return spending for the last `weeks` ISO weeks, ending with the current week."""
    today = date.today()
    iy, iw, _ = today.isocalendar()
    current_monday = date.fromisocalendar(iy, iw, 1)

    # Mondays in chronological order, oldest first
    week_starts = [current_monday - timedelta(weeks=weeks - 1 - i) for i in range(weeks)]

    range_start = week_starts[0]
    range_end = current_monday + timedelta(weeks=1)  # exclusive

    txns = (
        db.execute(
            select(Transaction).where(
                Transaction.occurred_at >= range_start,
                Transaction.occurred_at < range_end,
            )
        )
        .scalars()
        .all()
    )

    by_key: dict[tuple[int, int], int] = defaultdict(int)
    for t in txns:
        if t.type != "expense":
            continue
        ty, tw, _ = t.occurred_at.isocalendar()
        by_key[(ty, tw)] += abs(t.amount)

    buckets = [
        WeeklyBucket(
            week_number=i + 1,
            week_start=monday,
            spent=by_key.get(monday.isocalendar()[:2], 0),
        )
        for i, monday in enumerate(week_starts)
    ]
    return RollingWeeklyResponse(weeks=buckets)
