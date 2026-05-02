"""Seed the database from a CSV of transactions.

Wipes finance tables (categories, transactions, subscriptions, budgets), imports
all rows as transactions, and detects recurring (merchant, amount) pairs that
appear in 2+ distinct months as Subscriptions.

Run inside the api container:
    docker compose exec api uv run python scripts/seed_from_csv.py
or locally:
    cd api && uv run python scripts/seed_from_csv.py
"""

from __future__ import annotations

import csv
import hashlib
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.db.models import Budget, Category, Subscription, Transaction
from app.settings import settings

CSV_PATH = Path(__file__).parent / "seed_data.csv"

# CSV category name -> (display name, iconify icon, color, monthly_budget_cents)
CATEGORY_MAP: dict[str, tuple[str, str, str, int]] = {
    "Shopping":      ("Shopping",      "mdi:shopping-outline",      "#FF6B9D", 100000),
    "Food & Drink":  ("Restaurants",   "mdi:silverware-fork-knife", "#FFB74D",  50000),
    "Entertainment": ("Entertainment", "mdi:drama-masks",           "#A78BFA",  25000),
    "Travel":        ("Transport",     "mdi:bus",                   "#60A5FA",  25000),
}

# €2,000 per month — sized roughly 15% above typical observed spend.
MONTHLY_TOTAL_BUDGET_CENTS = 200_000

KNOWN_BRAND_COLORS: dict[str, str] = {
    "netflix":        "#E50914",
    "spotify":        "#1DB954",
    "icloud storage": "#147EFB",
    "gym membership": "#FF6B35",
    "amazon":         "#FF9900",
    "apple":          "#A2AAAD",
    "uber":           "#000000",
}

FALLBACK_PALETTE = [
    "#22C55E", "#3B82F6", "#EC4899", "#F59E0B",
    "#8B5CF6", "#06B6D4", "#EF4444", "#10B981",
]


@dataclass
class Row:
    occurred_at: date
    merchant: str
    csv_category: str
    amount_cents: int
    type: str  # "expense" | "income"


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
                    merchant=r["Description"].strip(),
                    csv_category=r["Category"].strip(),
                    amount_cents=-cents if t == "expense" else cents,
                    type=t,
                )
            )
    return rows


def color_for(name: str) -> str:
    key = name.strip().lower()
    if key in KNOWN_BRAND_COLORS:
        return KNOWN_BRAND_COLORS[key]
    h = int(hashlib.sha1(key.encode()).hexdigest(), 16)
    return FALLBACK_PALETTE[h % len(FALLBACK_PALETTE)]


def initials_for(name: str) -> str:
    parts = [p for p in name.strip().split() if p]
    if not parts:
        return "?"
    if len(parts) == 1:
        return parts[0][0].upper()
    return (parts[0][0] + parts[1][0]).upper()


def detect_subscriptions(expense_rows: list[Row]) -> list[dict]:
    """Group by (merchant lowercased, amount); recurring if ≥2 distinct months."""
    groups: dict[tuple[str, int], list[Row]] = defaultdict(list)
    for r in expense_rows:
        groups[(r.merchant.lower(), abs(r.amount_cents))].append(r)

    subs: list[dict] = []
    for (_, amount_cents), rs in groups.items():
        months = {(r.occurred_at.year, r.occurred_at.month) for r in rs}
        if len(months) < 2:
            continue
        latest = max(rs, key=lambda r: r.occurred_at)
        # Pick the canonical merchant name from any occurrence (they're all the same case-folded).
        name = latest.merchant
        next_charge = latest.occurred_at + timedelta(days=31)
        # Snap to the same day-of-month if possible.
        try:
            next_charge = next_charge.replace(day=latest.occurred_at.day)
        except ValueError:
            pass
        subs.append(
            {
                "name": name,
                "amount": amount_cents,
                "billing_cycle": "monthly",
                "next_charge_date": next_charge,
                "color": color_for(name),
                "initials": initials_for(name),
            }
        )
    return subs


def main() -> None:
    if not CSV_PATH.exists():
        raise SystemExit(f"CSV not found: {CSV_PATH}")

    rows = parse_csv(CSV_PATH)
    if not rows:
        raise SystemExit("CSV had no usable rows")

    print(f"Parsed {len(rows)} rows from {CSV_PATH.name}")

    engine = create_engine(settings.database_url)
    with Session(engine) as db:
        # Wipe in FK-safe order. Use SQL TRUNCATE to also reset PKs.
        for table in ("transactions", "subscriptions", "budgets", "categories"):
            db.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE"))
        db.commit()

        # Insert categories.
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

        # Insert transactions.
        for r in rows:
            db.add(
                Transaction(
                    category_id=cat_id_by_csv.get(r.csv_category),
                    bank="Demo Bank",
                    merchant_name=r.merchant,
                    amount=r.amount_cents,
                    type=r.type,
                    occurred_at=r.occurred_at,
                )
            )
        db.commit()
        print(f"Inserted {len(rows)} transactions")

        # Detect & insert subscriptions.
        expense_rows = [r for r in rows if r.type == "expense"]
        subs = detect_subscriptions(expense_rows)
        for s in subs:
            db.add(
                Subscription(
                    name=s["name"],
                    amount=s["amount"],
                    currency="EUR",
                    billing_cycle=s["billing_cycle"],
                    next_charge_date=s["next_charge_date"],
                    is_active=True,
                    color=s["color"],
                    initials=s["initials"],
                )
            )
        db.commit()
        print(
            f"Detected {len(subs)} subscriptions: "
            + ", ".join(s["name"] for s in subs)
        )

        # Insert a budget for every month present in the data.
        months = sorted({(r.occurred_at.year, r.occurred_at.month) for r in rows})
        for y, m in months:
            db.add(
                Budget(
                    month=f"{y:04d}-{m:02d}",
                    total_budget=MONTHLY_TOTAL_BUDGET_CENTS,
                )
            )
        db.commit()
        print(f"Inserted {len(months)} monthly budgets")


if __name__ == "__main__":
    main()
