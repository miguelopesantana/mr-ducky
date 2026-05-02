from typing import Any

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


def _envelope(code: str, message: str, details: Any = None) -> dict[str, Any]:
    body: dict[str, Any] = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return body


def not_found(resource: str) -> AppError:
    return AppError(
        code="NOT_FOUND",
        message=f"{resource} not found",
        status_code=status.HTTP_404_NOT_FOUND,
    )


def conflict(message: str, details: dict[str, Any] | None = None) -> AppError:
    return AppError(
        code="CONFLICT",
        message=message,
        status_code=status.HTTP_409_CONFLICT,
        details=details,
    )


def unauthorized(message: str = "Authentication required") -> AppError:
    return AppError(
        code="UNAUTHORIZED",
        message=message,
        status_code=status.HTTP_401_UNAUTHORIZED,
    )


def validation(message: str, details: dict[str, Any] | None = None) -> AppError:
    return AppError(
        code="VALIDATION_ERROR",
        message=message,
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        details=details,
    )


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=_envelope(exc.code, exc.message, exc.details),
    )


async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors: list[dict[str, Any]] = []
    for err in exc.errors():
        loc = [str(part) for part in err.get("loc", []) if part != "body"]
        errors.append(
            {
                "field": ".".join(loc) if loc else None,
                "type": err.get("type"),
                "message": err.get("msg"),
            }
        )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_envelope("VALIDATION_ERROR", "Request validation failed", {"errors": errors}),
    )


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
    }
    code = code_map.get(exc.status_code, "ERROR")
    message = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return JSONResponse(status_code=exc.status_code, content=_envelope(code, message))
