from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.errors import unauthorized
from app.settings import settings

_bearer = HTTPBearer(auto_error=False)


def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_pin(pin: str) -> bool:
    if not settings.admin_pin_hash:
        return False
    try:
        return bcrypt.checkpw(
            pin.encode("utf-8"), settings.admin_pin_hash.encode("utf-8")
        )
    except (ValueError, TypeError):
        return False


def issue_token() -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(
        {"sub": "admin", "exp": expire},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def require_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized()
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError:
        raise unauthorized("Invalid or expired token")
    sub = payload.get("sub")
    if not sub:
        raise unauthorized("Invalid token")
    return sub
