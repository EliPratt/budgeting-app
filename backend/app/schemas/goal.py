from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class GoalCreate(BaseModel):
    envelope_id: int
    target_amount: Decimal = Field(gt=0)
    target_date: date


class GoalUpdate(BaseModel):
    target_amount: Decimal | None = Field(default=None, gt=0)
    target_date: date | None = None


class GoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    envelope_id: int
    envelope_name: str
    target_amount: Decimal
    target_date: date
    current_balance: Decimal
    remaining: Decimal
    months_remaining: int
    suggested_monthly_contribution: Decimal
    percent_complete: Decimal
    achieved: bool
