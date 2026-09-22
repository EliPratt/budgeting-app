from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.envelope import Envelope
from app.models.transaction import Transaction
from app.services.reports import income_vs_expense_trend, net_worth_trend, spending_by_category


def _account(db_session: Session, starting_balance: str = "0") -> Account:
    account = Account(name="Checking", type="checking", starting_balance=Decimal(starting_balance))
    db_session.add(account)
    db_session.commit()
    db_session.refresh(account)
    return account


def _envelope(db_session: Session, name: str) -> Envelope:
    envelope = Envelope(name=name)
    db_session.add(envelope)
    db_session.commit()
    db_session.refresh(envelope)
    return envelope


def _txn(
    db_session: Session,
    account: Account,
    txn_date: date,
    amount: str,
    envelope: Envelope | None = None,
) -> Transaction:
    transaction = Transaction(
        account_id=account.id,
        envelope_id=envelope.id if envelope else None,
        date=txn_date,
        amount=Decimal(amount),
        payee="Test",
        source="manual",
    )
    db_session.add(transaction)
    db_session.commit()
    return transaction


def test_spending_by_category_sums_negative_amounts_per_envelope(db_session: Session) -> None:
    account = _account(db_session)
    groceries = _envelope(db_session, "Groceries")
    fun = _envelope(db_session, "Fun")
    _txn(db_session, account, date(2026, 1, 5), "-40.00", groceries)
    _txn(db_session, account, date(2026, 1, 10), "-10.00", groceries)
    _txn(db_session, account, date(2026, 1, 12), "-25.00", fun)
    _txn(db_session, account, date(2026, 1, 15), "1500.00", groceries)

    results = spending_by_category(db_session, date(2026, 1, 1), date(2026, 2, 1))

    by_name = {r["envelope_name"]: r["total"] for r in results}
    assert by_name["Groceries"] == Decimal("50.00")
    assert by_name["Fun"] == Decimal("25.00")


def test_spending_by_category_buckets_uncategorized_transactions(db_session: Session) -> None:
    account = _account(db_session)
    _txn(db_session, account, date(2026, 1, 5), "-15.00", envelope=None)

    results = spending_by_category(db_session, date(2026, 1, 1), date(2026, 2, 1))

    assert results == [
        {"envelope_id": None, "envelope_name": "Uncategorized", "total": Decimal("15.00")}
    ]


def test_spending_by_category_excludes_transactions_outside_the_range(db_session: Session) -> None:
    account = _account(db_session)
    groceries = _envelope(db_session, "Groceries")
    _txn(db_session, account, date(2026, 2, 1), "-40.00", groceries)

    results = spending_by_category(db_session, date(2026, 1, 1), date(2026, 2, 1))

    assert results == []


def test_spending_by_category_orders_by_total_descending(db_session: Session) -> None:
    account = _account(db_session)
    groceries = _envelope(db_session, "Groceries")
    fun = _envelope(db_session, "Fun")
    _txn(db_session, account, date(2026, 1, 5), "-10.00", fun)
    _txn(db_session, account, date(2026, 1, 5), "-50.00", groceries)

    results = spending_by_category(db_session, date(2026, 1, 1), date(2026, 2, 1))

    assert [r["envelope_name"] for r in results] == ["Groceries", "Fun"]


def test_income_vs_expense_trend_covers_the_requested_number_of_months(db_session: Session) -> None:
    account = _account(db_session)
    _txn(db_session, account, date(2026, 1, 5), "1000.00")
    _txn(db_session, account, date(2026, 1, 10), "-200.00")
    _txn(db_session, account, date(2026, 2, 5), "500.00")
    _txn(db_session, account, date(2026, 2, 10), "-300.00")

    trend = income_vs_expense_trend(db_session, as_of=date(2026, 2, 15), months=2)

    assert [point["month"] for point in trend] == ["2026-01", "2026-02"]
    assert trend[0]["income"] == Decimal("1000.00")
    assert trend[0]["expense"] == Decimal("200.00")
    assert trend[1]["income"] == Decimal("500.00")
    assert trend[1]["expense"] == Decimal("300.00")


def test_income_vs_expense_trend_reports_zero_for_a_month_with_no_activity(
    db_session: Session,
) -> None:
    trend = income_vs_expense_trend(db_session, as_of=date(2026, 1, 15), months=1)

    assert trend == [{"month": "2026-01", "income": Decimal("0.00"), "expense": Decimal("0.00")}]


def test_net_worth_trend_includes_starting_balances_and_activity(db_session: Session) -> None:
    account = _account(db_session, starting_balance="1000.00")
    _txn(db_session, account, date(2026, 1, 5), "-100.00")
    _txn(db_session, account, date(2026, 2, 5), "-50.00")

    trend = net_worth_trend(db_session, as_of=date(2026, 2, 15), months=2)

    assert trend == [
        {"month": "2026-01", "net_worth": Decimal("900.00")},
        {"month": "2026-02", "net_worth": Decimal("850.00")},
    ]


def test_net_worth_trend_carries_the_running_total_across_accounts(db_session: Session) -> None:
    checking = _account(db_session, starting_balance="500.00")
    savings = _account(db_session, starting_balance="2000.00")
    _txn(db_session, checking, date(2026, 1, 5), "-100.00")
    _txn(db_session, savings, date(2026, 1, 10), "50.00")

    trend = net_worth_trend(db_session, as_of=date(2026, 1, 15), months=1)

    assert trend == [{"month": "2026-01", "net_worth": Decimal("2450.00")}]
