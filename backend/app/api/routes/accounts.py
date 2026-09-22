from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.account import Account
from app.models.transaction import Transaction
from app.schemas.account import AccountCreate, AccountOut, AccountUpdate

router = APIRouter(dependencies=[Depends(get_current_user)])


def _to_out(db: Session, account: Account) -> AccountOut:
    transactions_total = db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.account_id == account.id
        )
    )
    balance = account.starting_balance + Decimal(transactions_total or 0)
    return AccountOut.model_validate({**account.__dict__, "balance": balance})


def _get_or_404(db: Session, account_id: int) -> Account:
    account = db.get(Account, account_id)
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return account


@router.post("", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def create_account(payload: AccountCreate, db: Session = Depends(get_db)) -> AccountOut:
    account = Account(**payload.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    return _to_out(db, account)


@router.get("", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db)) -> list[AccountOut]:
    accounts = db.scalars(select(Account)).all()
    return [_to_out(db, account) for account in accounts]


@router.get("/{account_id}", response_model=AccountOut)
def get_account(account_id: int, db: Session = Depends(get_db)) -> AccountOut:
    account = _get_or_404(db, account_id)
    return _to_out(db, account)


@router.patch("/{account_id}", response_model=AccountOut)
def update_account(
    account_id: int, payload: AccountUpdate, db: Session = Depends(get_db)
) -> AccountOut:
    account = _get_or_404(db, account_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(account, field, value)
    db.commit()
    db.refresh(account)
    return _to_out(db, account)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(account_id: int, db: Session = Depends(get_db)) -> None:
    account = _get_or_404(db, account_id)
    db.delete(account)
    db.commit()
