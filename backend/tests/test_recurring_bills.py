from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.envelope import Envelope
from app.models.recurring_bill import RecurringBill
from app.models.transaction import Transaction
from app.services.recurring_bills import advance_due_date, confirm_bill, list_due_bills


def _account(db_session: Session) -> Account:
    account = Account(name="Checking", type="checking", starting_balance=Decimal("0"))
    db_session.add(account)
    db_session.commit()
    db_session.refresh(account)
    return account


def _envelope(db_session: Session) -> Envelope:
    envelope = Envelope(name="Bills")
    db_session.add(envelope)
    db_session.commit()
    db_session.refresh(envelope)
    return envelope


def _bill(
    db_session: Session, account: Account, envelope: Envelope, next_due_date: date, frequency: str
) -> RecurringBill:
    bill = RecurringBill(
        name="Rent",
        account_id=account.id,
        envelope_id=envelope.id,
        amount=Decimal("-1200.00"),
        frequency=frequency,
        next_due_date=next_due_date,
    )
    db_session.add(bill)
    db_session.commit()
    db_session.refresh(bill)
    return bill


def test_advance_due_date_weekly() -> None:
    assert advance_due_date(date(2026, 1, 1), "weekly") == date(2026, 1, 8)


def test_advance_due_date_biweekly() -> None:
    assert advance_due_date(date(2026, 1, 1), "biweekly") == date(2026, 1, 15)


def test_advance_due_date_monthly_handles_month_length() -> None:
    assert advance_due_date(date(2026, 1, 31), "monthly") == date(2026, 2, 28)


def test_advance_due_date_yearly() -> None:
    assert advance_due_date(date(2026, 1, 1), "yearly") == date(2027, 1, 1)


def test_list_due_bills_includes_bills_due_today_and_overdue(db_session: Session) -> None:
    account = _account(db_session)
    envelope = _envelope(db_session)
    due_today = _bill(db_session, account, envelope, date(2026, 1, 15), "monthly")
    overdue = _bill(db_session, account, envelope, date(2026, 1, 1), "monthly")
    not_due_yet = _bill(db_session, account, envelope, date(2026, 2, 1), "monthly")

    due = list_due_bills(db_session, as_of=date(2026, 1, 15))

    due_ids = {bill.id for bill in due}
    assert due_ids == {due_today.id, overdue.id}
    assert not_due_yet.id not in due_ids


def test_confirm_bill_creates_a_transaction_on_the_due_date(db_session: Session) -> None:
    account = _account(db_session)
    envelope = _envelope(db_session)
    bill = _bill(db_session, account, envelope, date(2026, 1, 15), "monthly")

    transaction = confirm_bill(db_session, bill, as_of=date(2026, 1, 15))

    assert transaction.date == date(2026, 1, 15)
    assert transaction.amount == Decimal("-1200.00")
    assert transaction.payee == "Rent"
    assert transaction.envelope_id == envelope.id
    assert transaction.account_id == account.id
    assert transaction.source == "recurring"


def test_confirm_bill_advances_the_next_due_date(db_session: Session) -> None:
    account = _account(db_session)
    envelope = _envelope(db_session)
    bill = _bill(db_session, account, envelope, date(2026, 1, 15), "monthly")

    confirm_bill(db_session, bill, as_of=date(2026, 1, 15))

    assert bill.next_due_date == date(2026, 2, 15)


def test_confirm_bill_skips_past_multiple_missed_cycles(db_session: Session) -> None:
    account = _account(db_session)
    envelope = _envelope(db_session)
    bill = _bill(db_session, account, envelope, date(2026, 1, 1), "monthly")

    confirm_bill(db_session, bill, as_of=date(2026, 3, 20))

    assert bill.next_due_date == date(2026, 4, 1)


def test_confirm_bill_persists_the_transaction(db_session: Session) -> None:
    account = _account(db_session)
    envelope = _envelope(db_session)
    bill = _bill(db_session, account, envelope, date(2026, 1, 15), "monthly")

    confirm_bill(db_session, bill, as_of=date(2026, 1, 15))

    assert db_session.scalar(select(Transaction)) is not None
