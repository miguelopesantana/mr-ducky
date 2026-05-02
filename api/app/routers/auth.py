from fastapi import APIRouter, Depends, Response, status

from app.core.errors import unauthorized
from app.core.routing import CamelRoute
from app.core.security import issue_token, require_auth, verify_pin
from app.schemas.auth import LoginRequest, LoginResponse, UserMe
from app.settings import settings

router = APIRouter(route_class=CamelRoute)


def _me() -> UserMe:
    return UserMe(name=settings.owner_name, currency=settings.currency)


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest) -> LoginResponse:
    if not verify_pin(data.pin):
        raise unauthorized("Invalid PIN")
    return LoginResponse(token=issue_token(), user=_me())


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout() -> Response:
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserMe)
def me(_: str = Depends(require_auth)) -> UserMe:
    return _me()
