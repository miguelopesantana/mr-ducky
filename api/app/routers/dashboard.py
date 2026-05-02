from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.routing import CamelRoute
from app.core.security import require_auth
from app.deps import get_db
from app.schemas.dashboard import DashboardResponse
from app.services.dashboard import build_dashboard

router = APIRouter(
    dependencies=[Depends(require_auth)], route_class=CamelRoute
)


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    month: str = Query(..., description="YYYY-MM"),
    tz: str = Query(default="UTC", description="IANA timezone name"),
    db: Session = Depends(get_db),
) -> DashboardResponse:
    # tz is accepted for API stability; week bucketing is date-based and tz-independent.
    return build_dashboard(db, month)
