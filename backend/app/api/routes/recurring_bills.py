from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.account import Account
from app.models.envelope import Envelope
from app.models.recurring_bill import RecurringBill
from app.schemas.recurring_bill import ConfirmBillOut, RecurringBillCreate, RecurringBillOut
from app.services.recurring_bills import confirm_bill, list_due_bills

router = APIRouter(dependencies=[Depends(get_current_user)])


def _get_or_404(db: Session, bill_id: int) -> RecurringBill:
    bill = db.get(RecurringBill, bill_id)
    if bill is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recurring bill not found"
        )
    return bill


@router.post("", response_model=RecurringBillOut, status_code=status.HTTP_201_CREATED)
def create_recurring_bill(
    payload: RecurringBillCreate, db: Session = Depends(get_db)
) -> RecurringBill:
    if db.get(Account, payload.account_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    if db.get(Envelope, payload.envelope_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Envelope not found")
    bill = RecurringBill(**payload.model_dump())
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill


@router.get("", response_model=list[RecurringBillOut])
def list_recurring_bills(db: Session = Depends(get_db)) -> list[RecurringBill]:
    return list(db.scalars(select(RecurringBill).order_by(RecurringBill.next_due_date)))


@router.get("/due", response_model=list[RecurringBillOut])
def list_due_recurring_bills(db: Session = Depends(get_db)) -> list[RecurringBill]:
    return list_due_bills(db, date.today())


@router.post("/{bill_id}/confirm", response_model=ConfirmBillOut)
def confirm_recurring_bill(bill_id: int, db: Session = Depends(get_db)) -> dict:
    bill = _get_or_404(db, bill_id)
    transaction = confirm_bill(db, bill, date.today())
    return {"bill": bill, "transaction": transaction}


@router.delete("/{bill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring_bill(bill_id: int, db: Session = Depends(get_db)) -> None:
    bill = _get_or_404(db, bill_id)
    db.delete(bill)
    db.commit()
