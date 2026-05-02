from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.routing import CamelRoute
from app.core.security import require_auth
from app.db.models import Budget
from app.deps import get_db
from app.schemas.budget import BudgetOut, BudgetUpsert
from app.services.months import parse_month

router = APIRouter(
    dependencies=[Depends(require_auth)], route_class=CamelRoute
)


@router.get("/{month}", response_model=BudgetOut)
def get_budget(month: str, db: Session = Depends(get_db)) -> BudgetOut:
    _, _, normalized = parse_month(month)
    row = db.execute(select(Budget).where(Budget.month == normalized)).scalar_one_or_none()
    total = row.total_budget if row else 0
    return BudgetOut(month=normalized, total_budget=total)


@router.put("/{month}", response_model=BudgetOut)
def upsert_budget(
    month: str, data: BudgetUpsert, db: Session = Depends(get_db)
) -> BudgetOut:
    _, _, normalized = parse_month(month)
    row = db.execute(select(Budget).where(Budget.month == normalized)).scalar_one_or_none()
    if row is None:
        row = Budget(month=normalized, total_budget=data.total_budget)
        db.add(row)
    else:
        row.total_budget = data.total_budget
    db.commit()
    db.refresh(row)
    return BudgetOut(month=row.month, total_budget=row.total_budget)
