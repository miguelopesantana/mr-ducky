from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import not_found
from app.core.routing import CamelRoute
from app.core.security import require_auth
from app.db.models import Subscription
from app.deps import get_db
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionList,
    SubscriptionOut,
    SubscriptionUpdate,
)
from app.services.subscriptions import total_monthly_cost

router = APIRouter(
    dependencies=[Depends(require_auth)], route_class=CamelRoute
)


def _get_or_404(db: Session, sub_id: int) -> Subscription:
    sub = db.get(Subscription, sub_id)
    if sub is None:
        raise not_found("Subscription")
    return sub


@router.get("", response_model=SubscriptionList)
def list_subscriptions(db: Session = Depends(get_db)) -> SubscriptionList:
    subs = (
        db.execute(select(Subscription).order_by(Subscription.next_charge_date))
        .scalars()
        .all()
    )
    return SubscriptionList(
        items=[SubscriptionOut.model_validate(s) for s in subs],
        total_monthly_cost=total_monthly_cost(list(subs)),
    )


@router.post("", response_model=SubscriptionOut, status_code=status.HTTP_201_CREATED)
def create_subscription(
    data: SubscriptionCreate, db: Session = Depends(get_db)
) -> SubscriptionOut:
    sub = Subscription(
        name=data.name,
        logo_url=data.logo_url,
        amount=data.amount,
        currency=data.currency,
        billing_cycle=data.billing_cycle,
        next_charge_date=data.next_charge_date,
        is_active=True,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return SubscriptionOut.model_validate(sub)


@router.patch("/{sub_id}", response_model=SubscriptionOut)
def update_subscription(
    sub_id: int,
    data: SubscriptionUpdate,
    db: Session = Depends(get_db),
) -> SubscriptionOut:
    sub = _get_or_404(db, sub_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(sub, field, value)
    db.commit()
    db.refresh(sub)
    return SubscriptionOut.model_validate(sub)


@router.delete("/{sub_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subscription(sub_id: int, db: Session = Depends(get_db)) -> None:
    sub = _get_or_404(db, sub_id)
    db.delete(sub)
    db.commit()


@router.post("/{sub_id}/cancel", response_model=SubscriptionOut)
def cancel_subscription(
    sub_id: int, db: Session = Depends(get_db)
) -> SubscriptionOut:
    sub = _get_or_404(db, sub_id)
    sub.is_active = False
    db.commit()
    db.refresh(sub)
    return SubscriptionOut.model_validate(sub)
