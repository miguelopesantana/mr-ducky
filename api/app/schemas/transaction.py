from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import Field, model_validator

from app.schemas._base import ORMModel, StrictModel

TransactionType = Literal["expense", "income"]
BankField = Annotated[str, Field(min_length=1, max_length=64)]
MerchantField = Annotated[str, Field(min_length=1, max_length=128)]
NotesField = Annotated[str, Field(max_length=2000)]


class TransactionCreate(StrictModel):
    category_id: int | None = None
    bank: BankField
    merchant_name: MerchantField
    amount: int
    type: TransactionType
    occurred_at: date
    notes: NotesField | None = None

    @model_validator(mode="after")
    def _check_amount_sign(self) -> "TransactionCreate":
        if self.amount == 0:
            raise ValueError("amount cannot be zero")
        if self.type == "expense" and self.amount > 0:
            raise ValueError("expense amount must be negative")
        if self.type == "income" and self.amount < 0:
            raise ValueError("income amount must be positive")
        return self


class TransactionUpdate(StrictModel):
    category_id: int | None = None
    bank: BankField | None = None
    merchant_name: MerchantField | None = None
    amount: int | None = None
    type: TransactionType | None = None
    occurred_at: date | None = None
    notes: NotesField | None = None
    clear_category: bool = False

    @model_validator(mode="after")
    def _check_amount_sign(self) -> "TransactionUpdate":
        if self.amount is not None and self.amount == 0:
            raise ValueError("amount cannot be zero")
        if self.amount is not None and self.type is not None:
            if self.type == "expense" and self.amount > 0:
                raise ValueError("expense amount must be negative")
            if self.type == "income" and self.amount < 0:
                raise ValueError("income amount must be positive")
        return self


class TransactionOut(ORMModel):
    id: int
    category_id: int | None
    bank: str
    merchant_name: str
    amount: int
    type: TransactionType
    occurred_at: date
    notes: str | None
    created_at: datetime


class TransactionPage(StrictModel):
    items: list[TransactionOut]
    next_cursor: str | None = None
