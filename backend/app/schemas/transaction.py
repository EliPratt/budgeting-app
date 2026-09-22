import datetime as dt
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict


class TransactionSource(str, Enum):
    manual = "manual"
    import_ = "import"
    recurring = "recurring"


class TransactionCreate(BaseModel):
    account_id: int
    date: dt.date
    amount: Decimal
    payee: str
    envelope_id: int | None = None


class TransactionUpdate(BaseModel):
    date: dt.date | None = None
    amount: Decimal | None = None
    payee: str | None = None
    envelope_id: int | None = None


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    envelope_id: int | None
    date: dt.date
    amount: Decimal
    payee: str
    source: TransactionSource
