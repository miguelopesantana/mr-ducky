from typing import Annotated

from pydantic import Field

from app.schemas._base import StrictModel

TotalBudget = Annotated[int, Field(ge=0)]


class BudgetUpsert(StrictModel):
    total_budget: TotalBudget


class BudgetOut(StrictModel):
    month: str
    total_budget: int
