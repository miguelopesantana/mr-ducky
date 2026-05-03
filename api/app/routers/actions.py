"""Actions router: GET /calls, DELETE /calls/{id}."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import not_found
from app.core.routing import CamelRoute
from app.core.security import require_auth
from app.db.models import NegotiationCall
from app.deps import get_db
from app.schemas.actions import NegotiationCallList, NegotiationCallOut

router = APIRouter(
    dependencies=[Depends(require_auth)], route_class=CamelRoute
)


@router.get("/calls", response_model=NegotiationCallList)
def list_calls(db: Session = Depends(get_db)) -> NegotiationCallList:
    calls = (
        db.execute(select(NegotiationCall).order_by(NegotiationCall.created_at.desc()))
        .scalars()
        .all()
    )
    return NegotiationCallList(items=[NegotiationCallOut.model_validate(c) for c in calls])


@router.delete("/calls/{call_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_call(call_id: str, db: Session = Depends(get_db)) -> None:
    call = db.get(NegotiationCall, call_id)
    if call is None:
        raise not_found("Call")
    db.delete(call)
    db.commit()
