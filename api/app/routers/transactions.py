from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.core.errors import not_found, validation
from app.core.pagination import decode_cursor, encode_cursor
from app.core.routing import CamelRoute
from app.core.security import require_auth
from app.db.models import Category, Transaction
from app.deps import get_db
from app.schemas.transaction import (
    TransactionCreate,
    TransactionOut,
    TransactionPage,
    TransactionUpdate,
)

router = APIRouter(
    dependencies=[Depends(require_auth)], route_class=CamelRoute
)


def _ensure_category(db: Session, category_id: int | None) -> None:
    if category_id is None:
        return
    if db.get(Category, category_id) is None:
        raise validation("Unknown category_id", {"category_id": category_id})


def _get_or_404(db: Session, txn_id: int) -> Transaction:
    txn = db.get(Transaction, txn_id)
    if txn is None:
        raise not_found("Transaction")
    return txn


@router.get("", response_model=TransactionPage)
def list_transactions(
    db: Session = Depends(get_db),
    category_id: int | None = Query(default=None, alias="categoryId"),
    type: Literal["expense", "income"] | None = None,
    bank: str | None = None,
    search: str | None = None,
    from_: date | None = Query(default=None, alias="from"),
    to: date | None = None,
    min_amount: int | None = Query(default=None, alias="minAmount"),
    max_amount: int | None = Query(default=None, alias="maxAmount"),
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
) -> TransactionPage:
    conditions = []
    if category_id is not None:
        conditions.append(Transaction.category_id == category_id)
    if type is not None:
        conditions.append(Transaction.type == type)
    if bank is not None:
        conditions.append(Transaction.bank == bank)
    if search:
        conditions.append(Transaction.merchant_name.ilike(f"%{search}%"))
    if from_ is not None:
        conditions.append(Transaction.occurred_at >= from_)
    if to is not None:
        conditions.append(Transaction.occurred_at <= to)
    if min_amount is not None:
        conditions.append(Transaction.amount >= min_amount)
    if max_amount is not None:
        conditions.append(Transaction.amount <= max_amount)
    if from_ is not None and to is not None and from_ > to:
        raise validation("'from' must be on or before 'to'")
    if min_amount is not None and max_amount is not None and min_amount > max_amount:
        raise validation("'minAmount' must be <= 'maxAmount'")

    if cursor:
        cur_date, cur_id = decode_cursor(cursor)
        conditions.append(
            or_(
                Transaction.occurred_at < cur_date,
                and_(
                    Transaction.occurred_at == cur_date,
                    Transaction.id < cur_id,
                ),
            )
        )

    stmt = (
        select(Transaction)
        .where(*conditions)
        .order_by(Transaction.occurred_at.desc(), Transaction.id.desc())
        .limit(limit + 1)
    )

    rows = db.execute(stmt).scalars().all()
    next_cursor = None
    if len(rows) > limit:
        last = rows[limit - 1]
        next_cursor = encode_cursor(last.occurred_at, last.id)
        rows = rows[:limit]

    return TransactionPage(
        items=[TransactionOut.model_validate(r) for r in rows],
        next_cursor=next_cursor,
    )


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: TransactionCreate, db: Session = Depends(get_db)
) -> TransactionOut:
    _ensure_category(db, data.category_id)
    txn = Transaction(
        category_id=data.category_id,
        bank=data.bank,
        merchant_name=data.merchant_name,
        amount=data.amount,
        type=data.type,
        occurred_at=data.occurred_at,
        notes=data.notes,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return TransactionOut.model_validate(txn)


@router.get("/{txn_id}", response_model=TransactionOut)
def get_transaction(txn_id: int, db: Session = Depends(get_db)) -> TransactionOut:
    return TransactionOut.model_validate(_get_or_404(db, txn_id))


@router.patch("/{txn_id}", response_model=TransactionOut)
def update_transaction(
    txn_id: int,
    data: TransactionUpdate,
    db: Session = Depends(get_db),
) -> TransactionOut:
    txn = _get_or_404(db, txn_id)
    payload = data.model_dump(exclude_unset=True)
    clear_category = payload.pop("clear_category", False)

    new_type = payload.get("type", txn.type)
    new_amount = payload.get("amount", txn.amount)
    if new_type == "expense" and new_amount > 0:
        raise validation("expense amount must be negative")
    if new_type == "income" and new_amount < 0:
        raise validation("income amount must be positive")

    if "category_id" in payload and payload["category_id"] is not None:
        _ensure_category(db, payload["category_id"])
    if clear_category:
        payload["category_id"] = None

    for field, value in payload.items():
        setattr(txn, field, value)
    db.commit()
    db.refresh(txn)
    return TransactionOut.model_validate(txn)


@router.delete("/{txn_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(txn_id: int, db: Session = Depends(get_db)) -> None:
    txn = _get_or_404(db, txn_id)
    db.delete(txn)
    db.commit()
