from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.account import Account
from app.models.envelope import Envelope
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionOut, TransactionUpdate

router = APIRouter(dependencies=[Depends(get_current_user)])


def _get_or_404(db: Session, transaction_id: int) -> Transaction:
    transaction = db.get(Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return transaction


def _validate_references(db: Session, account_id: int, envelope_id: int | None) -> None:
    if db.get(Account, account_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    if envelope_id is not None and db.get(Envelope, envelope_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Envelope not found")


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db)) -> Transaction:
    _validate_references(db, payload.account_id, payload.envelope_id)
    transaction = Transaction(**payload.model_dump(), source="manual")
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.get("", response_model=list[TransactionOut])
def list_transactions(
    account_id: int | None = None,
    envelope_id: int | None = None,
    db: Session = Depends(get_db),
) -> list[Transaction]:
    query = select(Transaction)
    if account_id is not None:
        query = query.where(Transaction.account_id == account_id)
    if envelope_id is not None:
        query = query.where(Transaction.envelope_id == envelope_id)
    query = query.order_by(Transaction.date.desc(), Transaction.id.desc())
    return list(db.scalars(query))


@router.get("/{transaction_id}", response_model=TransactionOut)
def get_transaction(transaction_id: int, db: Session = Depends(get_db)) -> Transaction:
    return _get_or_404(db, transaction_id)


@router.patch("/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: int, payload: TransactionUpdate, db: Session = Depends(get_db)
) -> Transaction:
    transaction = _get_or_404(db, transaction_id)
    updates = payload.model_dump(exclude_unset=True)
    if "envelope_id" in updates and updates["envelope_id"] is not None:
        if db.get(Envelope, updates["envelope_id"]) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Envelope not found")
    for field, value in updates.items():
        setattr(transaction, field, value)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)) -> None:
    transaction = _get_or_404(db, transaction_id)
    db.delete(transaction)
    db.commit()
