from decimal import Decimal

from pydantic import BaseModel


class CategorySpendingOut(BaseModel):
    envelope_id: int | None
    envelope_name: str
    total: Decimal


class MonthlyTrendPointOut(BaseModel):
    month: str
    income: Decimal
    expense: Decimal


class NetWorthPointOut(BaseModel):
    month: str
    net_worth: Decimal
