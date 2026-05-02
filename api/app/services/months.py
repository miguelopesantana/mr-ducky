import re
from calendar import monthrange
from datetime import date, datetime, timedelta, timezone

from app.core.errors import validation

MONTH_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


def parse_month(value: str) -> tuple[date, date, str]:
    """Validate a YYYY-MM string and return (start_inclusive, end_exclusive, normalized)."""
    if not isinstance(value, str) or not MONTH_RE.match(value):
        raise validation("month must be YYYY-MM", {"value": value})
    year, month = (int(p) for p in value.split("-"))
    start = date(year, month, 1)
    last_day = monthrange(year, month)[1]
    end_exclusive = date(year, month, last_day) + timedelta(days=1)
    return start, end_exclusive, f"{year:04d}-{month:02d}"


def current_month_str() -> str:
    today = datetime.now(timezone.utc).date()
    return f"{today.year:04d}-{today.month:02d}"
