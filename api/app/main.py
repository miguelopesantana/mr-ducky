from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.errors import (
    AppError,
    app_error_handler,
    http_exception_handler,
    validation_error_handler,
)
from app.routers import (
    auth,
    budgets,
    categories,
    chat,
    dashboard,
    gocardless,
    subscriptions,
    transactions,
)
from app.settings import settings

app = FastAPI(title="mr-ducky api", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(categories.router, prefix="/categories", tags=["categories"])
app.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
app.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])
app.include_router(budgets.router, prefix="/budgets", tags=["budgets"])
app.include_router(gocardless.router, prefix="/gocardless", tags=["gocardless"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])


@app.get("/health")
def health():
    return {"status": "ok"}
