from decimal import Decimal

from pydantic import BaseModel


class EnvelopeMonthAssign(BaseModel):
    assigned_amount: Decimal


class EnvelopeSummaryOut(BaseModel):
    id: int
    name: str
    group_name: str | None
    assigned: Decimal
    activity: Decimal
    available: Decimal


class MonthSummaryOut(BaseModel):
    total_income: Decimal
    total_assigned: Decimal
    to_be_assigned: Decimal
    balanced: bool


class MonthOverviewOut(BaseModel):
    year: int
    month: int
    envelopes: list[EnvelopeSummaryOut]
    summary: MonthSummaryOut
