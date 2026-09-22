from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict


class AccountType(str, Enum):
    checking = "checking"
    savings = "savings"
    credit_card = "credit_card"


class AccountCreate(BaseModel):
    name: str
    type: AccountType
    starting_balance: Decimal


class AccountUpdate(BaseModel):
    name: str | None = None
    type: AccountType | None = None
    starting_balance: Decimal | None = None


class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: AccountType
    starting_balance: Decimal
    balance: Decimal
