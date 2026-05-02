from datetime import datetime
from typing import Annotated

from pydantic import Field

from app.schemas._base import ORMModel, StrictModel

NameField = Annotated[str, Field(min_length=1, max_length=64)]
EmojiField = Annotated[str, Field(min_length=1, max_length=16)]
ColorField = Annotated[str, Field(pattern=r"^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$")]
BudgetField = Annotated[int, Field(ge=0)]


class CategoryCreate(StrictModel):
    name: NameField
    emoji: EmojiField
    color: ColorField
    monthly_budget: BudgetField = 0


class CategoryUpdate(StrictModel):
    name: NameField | None = None
    emoji: EmojiField | None = None
    color: ColorField | None = None
    monthly_budget: BudgetField | None = None


class CategoryOut(ORMModel):
    id: int
    name: str
    emoji: str
    color: str
    monthly_budget: int
    created_at: datetime


class CategoryWithStats(CategoryOut):
    spent: int
    transaction_count: int
