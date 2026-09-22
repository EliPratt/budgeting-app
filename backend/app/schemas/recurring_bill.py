from datetime import date
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict

from app.schemas.transaction import TransactionOut


class BillFrequency(str, Enum):
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"
    yearly = "yearly"


class RecurringBillCreate(BaseModel):
    name: str
    account_id: int
    envelope_id: int
    amount: Decimal
    frequency: BillFrequency
    next_due_date: date


class RecurringBillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    account_id: int
    envelope_id: int
    amount: Decimal
    frequency: BillFrequency
    next_due_date: date


class ConfirmBillOut(BaseModel):
    bill: RecurringBillOut
    transaction: TransactionOut
