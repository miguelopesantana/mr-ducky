from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import conflict, not_found
from app.core.routing import CamelRoute
from app.core.security import require_auth
from app.db.models import Category, Transaction
from app.deps import get_db
from app.schemas.category import (
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
    CategoryWithStats,
)
from app.services.months import current_month_str, parse_month

router = APIRouter(
    dependencies=[Depends(require_auth)], route_class=CamelRoute
)


def _get_or_404(db: Session, category_id: int) -> Category:
    cat = db.get(Category, category_id)
    if cat is None:
        raise not_found("Category")
    return cat


@router.get("", response_model=list[CategoryWithStats])
def list_categories(db: Session = Depends(get_db)) -> list[CategoryWithStats]:
    start, end, _ = parse_month(current_month_str())
    spent_expr = func.coalesce(func.sum(func.abs(Transaction.amount)), 0).label("spent")
    count_expr = func.count(Transaction.id).label("txn_count")

    stmt = (
        select(Category, spent_expr, count_expr)
        .outerjoin(
            Transaction,
            (Transaction.category_id == Category.id)
            & (Transaction.occurred_at >= start)
            & (Transaction.occurred_at < end)
            & (Transaction.type == "expense"),
        )
        .group_by(Category.id)
        .order_by(Category.name)
    )

    rows = db.execute(stmt).all()
    return [
        CategoryWithStats(
            id=cat.id,
            name=cat.name,
            emoji=cat.emoji,
            color=cat.color,
            monthly_budget=cat.monthly_budget,
            created_at=cat.created_at,
            spent=int(spent or 0),
            transaction_count=int(count or 0),
        )
        for cat, spent, count in rows
    ]


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate, db: Session = Depends(get_db)
) -> CategoryOut:
    cat = Category(
        name=data.name,
        emoji=data.emoji,
        color=data.color,
        monthly_budget=data.monthly_budget,
    )
    db.add(cat)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise conflict("Category with this name already exists", {"field": "name"})
    db.refresh(cat)
    return CategoryOut.model_validate(cat)


@router.get("/{category_id}", response_model=CategoryOut)
def get_category(
    category_id: int, db: Session = Depends(get_db)
) -> CategoryOut:
    return CategoryOut.model_validate(_get_or_404(db, category_id))


@router.patch("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
) -> CategoryOut:
    cat = _get_or_404(db, category_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise conflict("Category with this name already exists", {"field": "name"})
    db.refresh(cat)
    return CategoryOut.model_validate(cat)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: Session = Depends(get_db)) -> None:
    cat = _get_or_404(db, category_id)
    # Detach transactions before delete (sqlite doesn't honor ON DELETE without PRAGMA).
    db.query(Transaction).filter(Transaction.category_id == category_id).update(
        {Transaction.category_id: None}, synchronize_session=False
    )
    db.delete(cat)
    db.commit()
