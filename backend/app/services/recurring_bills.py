"""Recurring bill templates: surfacing what's due, and confirming a due bill
as an actual transaction.

Confirming records the transaction on the bill's *original* due date, not
the confirmation date — the bill was owed on that date regardless of when
the user got around to acknowledging it. If a bill has been missed for
several cycles, confirming it advances `next_due_date` past every missed
cycle up to `as_of` in one step, rather than requiring one confirmation per
missed cycle.
"""

from datetime import date

from dateutil.relativedelta import relativedelta
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.recurring_bill import RecurringBill
from app.models.transaction import Transaction

_FREQUENCY_DELTAS = {
    "weekly": relativedelta(weeks=1),
    "biweekly": relativedelta(weeks=2),
    "monthly": relativedelta(months=1),
    "yearly": relativedelta(years=1),
}


def advance_due_date(due_date: date, frequency: str) -> date:
    return due_date + _FREQUENCY_DELTAS[frequency]


def list_due_bills(db: Session, as_of: date) -> list[RecurringBill]:
    query = select(RecurringBill).where(RecurringBill.next_due_date <= as_of).order_by(
        RecurringBill.next_due_date
    )
    return list(db.scalars(query))


def confirm_bill(db: Session, bill: RecurringBill, as_of: date) -> Transaction:
    transaction = Transaction(
        account_id=bill.account_id,
        envelope_id=bill.envelope_id,
        date=bill.next_due_date,
        amount=bill.amount,
        payee=bill.name,
        source="recurring",
    )
    db.add(transaction)

    while bill.next_due_date <= as_of:
        bill.next_due_date = advance_due_date(bill.next_due_date, bill.frequency)

    db.commit()
    db.refresh(transaction)
    db.refresh(bill)
    return transaction
