"""Seed the database with demo finance data.

Wipes finance tables (categories, transactions, subscriptions, budgets) and then
either:
  - generates realistic Portuguese household spending data (default), or
  - imports and date-shifts the legacy dummy-data CSV via ``--csv``.

Run inside the api container:
    docker compose exec api uv run python scripts/seed_from_csv.py
or locally:
    cd api && uv run python scripts/seed_from_csv.py

Options:
    --csv           Import from the legacy CSV instead of generating realistic data
    --months N      Number of calendar months to generate (default 3)
    --limit N       Import at most N CSV transactions (default 500)
    --all           Import every CSV row
"""

from __future__ import annotations

import argparse
import csv
import random
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.db.models import Budget, Category, Subscription, Transaction
from app.settings import settings

CSV_PATH = Path(__file__).resolve().parent.parent.parent / "dummy-data" / "Personal_Finance_Dataset.csv"

# CSV category -> (display name, iconify icon, color, monthly_budget_cents)
CATEGORY_MAP: dict[str, tuple[str, str, str, int]] = {
    "Groceries":        ("Groceries",        "mdi:cart-outline",          "#22C55E",  45_000),
    "Shopping":         ("Shopping",         "mdi:shopping-outline",      "#FF6B9D",  20_000),
    "Food & Drink":     ("Restaurants",      "mdi:silverware-fork-knife", "#FFB74D",  22_000),
    "Entertainment":    ("Entertainment",    "mdi:drama-masks",           "#A78BFA",  12_000),
    "Travel":           ("Transport",        "mdi:bus",                   "#60A5FA",  18_000),
    "Rent":             ("Rent",             "mdi:home-outline",          "#F472B6",  85_000),
    "Utilities":        ("Utilities",        "mdi:flash",                 "#FBBF24",  18_000),
    "Health & Fitness": ("Health & Fitness", "mdi:heart-pulse",           "#34D399",   8_000),
    "Salary":           ("Salary",           "mdi:cash-multiple",         "#22C55E",       0),
    "Investment":       ("Investment",       "mdi:chart-line",            "#3B82F6",       0),
    "Other":            ("Other",            "mdi:dots-horizontal",       "#94A3B8",  10_000),
}

# (name, amount_cents, billing_cycle, color, initials)
SUBSCRIPTIONS: list[tuple[str, int, str, str, str]] = [
    ("Netflix",         1399, "monthly", "#E50914", "NF"),
    ("Spotify",          999, "monthly", "#1DB954", "SP"),
    ("iCloud Storage",   299, "monthly", "#147EFB", "iC"),
    ("YouTube Premium", 1199, "monthly", "#FF0000", "YT"),
    ("Amazon Prime",     899, "monthly", "#FF9900", "AP"),
    ("Gym Membership",  2999, "monthly", "#FF6B35", "GM"),
]


@dataclass
class Row:
    occurred_at: date
    merchant: str
    csv_category: str
    amount_cents: int
    type: str  # "expense" | "income"


REALISTIC_BANKS = ["CGD", "Millennium BCP", "ActivoBank", "Novo Banco"]

REALISTIC_MERCHANTS: dict[str, list[str]] = {
    "Groceries": ["Pingo Doce", "Continente", "Lidl", "Mercadona", "Auchan"],
    "Shopping": ["Amazon", "Zara", "H&M", "IKEA", "FNAC"],
    "Food & Drink": ["Delta Cafe", "Padaria Portuguesa", "Uber Eats", "McDonald's", "Vitaminas"],
    "Entertainment": ["Cinema NOS", "Steam", "Ticketline", "Wook", "Bowling City"],
    "Travel": ["Galp", "BP", "Uber", "CP", "Carris", "Bolt"],
    "Rent": ["Transferencia Senhorio"],
    "Utilities": ["EDP Comercial", "NOS Comunicacoes", "EPAL", "MEO"],
    "Health & Fitness": ["Farmacia Central", "CUF", "Wells", "Holmes Place"],
    "Salary": ["Salario Empresa"],
    "Investment": ["Juros Poupanca", "Reforco Investimento"],
    "Other": ["Levantamento MB", "Comissao Conta", "CTT", "Payshop"],
}


def parse_csv(path: Path) -> list[Row]:
    rows: list[Row] = []
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            t = r["Type"].strip().lower()
            if t not in ("expense", "income"):
                continue
            amount_eur = float(r["Amount"])
            cents = int(round(amount_eur * 100))
            rows.append(
                Row(
                    occurred_at=date.fromisoformat(r["Date"].strip()),
                    merchant=r["Transaction Description"].strip(),
                    csv_category=r["Category"].strip(),
                    amount_cents=-cents if t == "expense" else cents,
                    type=t,
                )
            )
    return rows


def monthly_total_budget_cents() -> int:
    return sum(
        budget
        for csv_name, (_, _, _, budget) in CATEGORY_MAP.items()
        if csv_name not in {"Salary", "Investment"}
    )


def shift_dates(rows: list[Row], end_date: date | None = None) -> None:
    """Compress the original date range into the 12 months ending at end_date."""
    if not rows:
        return
    end = end_date or date.today()
    start_target = end - timedelta(days=365)

    orig_min = min(r.occurred_at for r in rows)
    orig_max = max(r.occurred_at for r in rows)
    orig_span = (orig_max - orig_min).days or 1
    target_span = (end - start_target).days

    for r in rows:
        frac = (r.occurred_at - orig_min).days / orig_span
        r.occurred_at = start_target + timedelta(days=int(frac * target_span))


def sample_rows(rows: list[Row], limit: int) -> list[Row]:
    """Proportional stratified sample preserving the income/expense ratio."""
    if len(rows) <= limit:
        return rows

    random.seed(42)
    income = [r for r in rows if r.type == "income"]
    expenses = [r for r in rows if r.type == "expense"]

    ratio = len(income) / len(rows)
    n_income = max(1, int(limit * ratio))
    n_expense = limit - n_income

    sampled = random.sample(income, min(n_income, len(income)))
    sampled += random.sample(expenses, min(n_expense, len(expenses)))
    sampled.sort(key=lambda r: r.occurred_at)
    return sampled


def month_bounds(anchor: date) -> tuple[date, date]:
    start = anchor.replace(day=1)
    if anchor.month == 12:
        next_month = anchor.replace(year=anchor.year + 1, month=1, day=1)
    else:
        next_month = anchor.replace(month=anchor.month + 1, day=1)
    return start, next_month - timedelta(days=1)


def subtract_months(anchor: date, months: int) -> date:
    total_months = anchor.year * 12 + (anchor.month - 1) - months
    year = total_months // 12
    month = total_months % 12 + 1
    return date(year, month, 1)


def iter_month_starts(end_date: date, months: int) -> list[date]:
    return [subtract_months(end_date.replace(day=1), offset) for offset in reversed(range(months))]


def eur_to_cents(amount_eur: float) -> int:
    return int(round(amount_eur * 100))


def clipped_lognormal_eur(mu: float, sigma: float, minimum: float, maximum: float) -> float:
    value = random.lognormvariate(mu, sigma)
    return max(minimum, min(maximum, value))


def clipped_normal_eur(mean: float, stddev: float, minimum: float, maximum: float) -> float:
    value = random.normalvariate(mean, stddev)
    return max(minimum, min(maximum, value))


def random_day_in_month(month_start: date, minimum_day: int, maximum_day: int) -> date:
    _, month_end = month_bounds(month_start)
    day = random.randint(minimum_day, min(maximum_day, month_end.day))
    return month_start.replace(day=day)


def random_expense_date(month_start: date, weekdays: set[int] | None = None) -> date:
    _, month_end = month_bounds(month_start)
    for _ in range(20):
        candidate = random_day_in_month(month_start, 1, month_end.day)
        if weekdays is None or candidate.weekday() in weekdays:
            return candidate
    return random_day_in_month(month_start, 1, month_end.day)


def make_row(
    occurred_at: date,
    csv_category: str,
    amount_cents: int,
    tx_type: str,
    merchant: str | None = None,
) -> Row:
    return Row(
        occurred_at=occurred_at,
        merchant=merchant or random.choice(REALISTIC_MERCHANTS[csv_category]),
        csv_category=csv_category,
        amount_cents=-abs(amount_cents) if tx_type == "expense" else abs(amount_cents),
        type=tx_type,
    )


def generate_realistic_pt(months: int = 3, today: date | None = None) -> list[Row]:
    random.seed(42)
    anchor = today or date.today()
    rows: list[Row] = []

    for month_start in iter_month_starts(anchor, months):
        rows.append(
            make_row(
                occurred_at=random_day_in_month(month_start, 26, 28),
                csv_category="Salary",
                amount_cents=eur_to_cents(clipped_normal_eur(1_650, 120, 1_450, 2_050)),
                tx_type="income",
                merchant="Salario Empresa",
            )
        )

        if random.random() < 0.35:
            rows.append(
                make_row(
                    occurred_at=random_day_in_month(month_start, 8, 20),
                    csv_category="Investment",
                    amount_cents=eur_to_cents(clipped_normal_eur(45, 18, 10, 95)),
                    tx_type="income",
                )
            )

        rows.append(
            make_row(
                occurred_at=random_day_in_month(month_start, 1, 5),
                csv_category="Rent",
                amount_cents=eur_to_cents(clipped_normal_eur(850, 20, 825, 895)),
                tx_type="expense",
                merchant="Transferencia Senhorio",
            )
        )

        for merchant, mean, stddev in (
            ("EDP Comercial", 58, 8),
            ("NOS Comunicacoes", 41, 5),
            ("EPAL", 27, 4),
        ):
            rows.append(
                make_row(
                    occurred_at=random_day_in_month(month_start, 5, 24),
                    csv_category="Utilities",
                    amount_cents=eur_to_cents(clipped_normal_eur(mean, stddev, mean * 0.6, mean * 1.4)),
                    tx_type="expense",
                    merchant=merchant,
                )
            )

        grocery_count = random.randint(10, 12)
        for _ in range(grocery_count):
            rows.append(
                make_row(
                    occurred_at=random_expense_date(month_start, weekdays={0, 1, 2, 3, 4, 5}),
                    csv_category="Groceries",
                    amount_cents=eur_to_cents(clipped_lognormal_eur(3.7, 0.45, 12, 110)),
                    tx_type="expense",
                )
            )

        restaurant_count = random.randint(8, 12)
        for _ in range(restaurant_count):
            rows.append(
                make_row(
                    occurred_at=random_expense_date(month_start),
                    csv_category="Food & Drink",
                    amount_cents=eur_to_cents(clipped_lognormal_eur(2.75, 0.5, 4.5, 32)),
                    tx_type="expense",
                )
            )

        transport_count = random.randint(4, 6)
        for _ in range(transport_count):
            rows.append(
                make_row(
                    occurred_at=random_expense_date(month_start),
                    csv_category="Travel",
                    amount_cents=eur_to_cents(clipped_lognormal_eur(3.35, 0.5, 8, 78)),
                    tx_type="expense",
                )
            )

        shopping_count = random.randint(2, 4)
        for _ in range(shopping_count):
            rows.append(
                make_row(
                    occurred_at=random_expense_date(month_start),
                    csv_category="Shopping",
                    amount_cents=eur_to_cents(clipped_lognormal_eur(3.55, 0.65, 10, 145)),
                    tx_type="expense",
                )
            )

        entertainment_count = random.randint(1, 3)
        for _ in range(entertainment_count):
            rows.append(
                make_row(
                    occurred_at=random_expense_date(month_start),
                    csv_category="Entertainment",
                    amount_cents=eur_to_cents(clipped_lognormal_eur(2.95, 0.5, 7, 48)),
                    tx_type="expense",
                )
            )

        health_count = random.randint(1, 3)
        for _ in range(health_count):
            rows.append(
                make_row(
                    occurred_at=random_expense_date(month_start),
                    csv_category="Health & Fitness",
                    amount_cents=eur_to_cents(clipped_lognormal_eur(3.0, 0.55, 6, 54)),
                    tx_type="expense",
                )
            )

        cash_count = random.randint(1, 2)
        for _ in range(cash_count):
            rows.append(
                make_row(
                    occurred_at=random_expense_date(month_start),
                    csv_category="Other",
                    amount_cents=eur_to_cents(clipped_normal_eur(55, 18, 20, 110)),
                    tx_type="expense",
                    merchant="Levantamento MB",
                )
            )

        if random.random() < 0.45:
            rows.append(
                make_row(
                    occurred_at=random_day_in_month(month_start, 1, 28),
                    csv_category="Other",
                    amount_cents=eur_to_cents(clipped_normal_eur(4.2, 0.8, 2.5, 6.5)),
                    tx_type="expense",
                    merchant="Comissao Conta",
                )
            )

    rows.sort(key=lambda row: (row.occurred_at, row.type, row.merchant))
    return rows


def next_charge_from_today(today: date = None) -> date:
    t = today or date.today()
    # next charge on the 1st of next month
    if t.month == 12:
        return t.replace(year=t.year + 1, month=1, day=1)
    return t.replace(month=t.month + 1, day=1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed DB with demo finance data")
    parser.add_argument(
        "--csv",
        action="store_true",
        help="Import the legacy CSV instead of generating realistic Portuguese data",
    )
    parser.add_argument(
        "--months",
        type=int,
        default=3,
        help="Number of months of realistic data to generate",
    )
    parser.add_argument("--limit", type=int, default=500, help="Max transactions to import")
    parser.add_argument("--all", action="store_true", help="Import every row")
    args = parser.parse_args()

    if args.csv:
        if not CSV_PATH.exists():
            raise SystemExit(f"CSV not found: {CSV_PATH}")

        rows = parse_csv(CSV_PATH)
        if not rows:
            raise SystemExit("CSV had no usable rows")

        print(f"Parsed {len(rows)} rows from {CSV_PATH.name}")

        if not args.all:
            rows = sample_rows(rows, args.limit)
            print(f"Sampled down to {len(rows)} rows")

        shift_dates(rows)
        print(f"Dates shifted to {rows[0].occurred_at} — {rows[-1].occurred_at}")
    else:
        if args.months < 1:
            raise SystemExit("--months must be at least 1")
        rows = generate_realistic_pt(months=args.months)
        print(
            f"Generated {len(rows)} realistic Portuguese transactions across "
            f"{args.months} months ({rows[0].occurred_at} — {rows[-1].occurred_at})"
        )

    engine = create_engine(settings.database_url)
    with Session(engine) as db:
        for table in ("transactions", "subscriptions", "budgets", "categories"):
            db.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE"))
        db.commit()

        cat_id_by_csv: dict[str, int] = {}
        for csv_name, (display, icon, color, budget) in CATEGORY_MAP.items():
            cat = Category(
                name=display,
                emoji=icon,
                color=color,
                monthly_budget=budget,
            )
            db.add(cat)
            db.flush()
            cat_id_by_csv[csv_name] = cat.id
        db.commit()
        print(f"Inserted {len(cat_id_by_csv)} categories")

        for r in rows:
            db.add(
                Transaction(
                    category_id=cat_id_by_csv.get(r.csv_category),
                    bank=random.choice(REALISTIC_BANKS),
                    merchant_name=r.merchant,
                    amount=r.amount_cents,
                    type=r.type,
                    occurred_at=r.occurred_at,
                )
            )
        db.commit()
        print(f"Inserted {len(rows)} transactions")

        next_charge = next_charge_from_today()
        for name, amount_cents, cycle, color, initials in SUBSCRIPTIONS:
            db.add(
                Subscription(
                    name=name,
                    amount=amount_cents,
                    currency="EUR",
                    billing_cycle=cycle,
                    next_charge_date=next_charge,
                    is_active=True,
                    color=color,
                    initials=initials,
                )
            )
        db.commit()
        print(
            f"Inserted {len(SUBSCRIPTIONS)} subscriptions: "
            + ", ".join(name for name, *_ in SUBSCRIPTIONS)
        )

        months = sorted({(r.occurred_at.year, r.occurred_at.month) for r in rows})
        for y, m in months:
            db.add(
                Budget(
                    month=f"{y:04d}-{m:02d}",
                    total_budget=monthly_total_budget_cents(),
                )
            )
        db.commit()
        print(f"Inserted {len(months)} monthly budgets")


if __name__ == "__main__":
    main()
