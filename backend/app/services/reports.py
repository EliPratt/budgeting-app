"""Spending-by-category, income-vs-expense, and net-worth reports.

`spending_by_category` deliberately queries categorized and uncategorized
transactions separately: an inner join from `Envelope` to `Transaction`
silently drops every transaction with a NULL `envelope_id`, which would
make "Uncategorized" spending vanish from the report instead of showing up
as something the user should go categorize.
"""

from datetime import date
from decimal import Decimal

from sqlalchemy import ColumnElement, func, select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.envelope import Envelope
from app.models.transaction import Transaction
from app.services.envelope_months import month_bounds

ZERO = Decimal("0.00")


def _sum(db: Session, *conditions: ColumnElement[bool]) -> Decimal:
    total = db.scalar(select(func.coalesce(func.sum(Transaction.amount), 0)).where(*conditions))
    return Decimal(total).quantize(ZERO) if total is not None else ZERO


def _month_range(as_of: date, months: int) -> list[tuple[int, int]]:
    year, month = as_of.year, as_of.month
    result = []
    for _ in range(months):
        result.append((year, month))
        month -= 1
        if month == 0:
            month, year = 12, year - 1
    return list(reversed(result))


def spending_by_category(db: Session, start: date, end: date) -> list[dict]:
    categorized = db.execute(
        select(Envelope.id, Envelope.name, func.sum(-Transaction.amount))
        .join(Transaction, Transaction.envelope_id == Envelope.id)
        .where(Transaction.date >= start, Transaction.date < end, Transaction.amount < 0)
        .group_by(Envelope.id, Envelope.name)
    ).all()

    results = [
        {"envelope_id": row[0], "envelope_name": row[1], "total": Decimal(row[2]).quantize(ZERO)}
        for row in categorized
    ]

    uncategorized_total = -_sum(
        db,
        Transaction.envelope_id.is_(None),
        Transaction.date >= start,
        Transaction.date < end,
        Transaction.amount < 0,
    )
    if uncategorized_total > ZERO:
        results.append(
            {"envelope_id": None, "envelope_name": "Uncategorized", "total": uncategorized_total}
        )

    results.sort(key=lambda r: r["total"], reverse=True)
    return results


def income_vs_expense_trend(db: Session, as_of: date, months: int) -> list[dict]:
    points = []
    for year, month in _month_range(as_of, months):
        start, end = month_bounds(year, month)
        income = _sum(db, Transaction.date >= start, Transaction.date < end, Transaction.amount > 0)
        expense = -_sum(
            db, Transaction.date >= start, Transaction.date < end, Transaction.amount < 0
        )
        points.append({"month": f"{year:04d}-{month:02d}", "income": income, "expense": expense})
    return points


def net_worth_trend(db: Session, as_of: date, months: int) -> list[dict]:
    accounts_starting_total = db.scalar(
        select(func.coalesce(func.sum(Account.starting_balance), 0))
    )
    starting_total = (
        Decimal(accounts_starting_total).quantize(ZERO)
        if accounts_starting_total is not None
        else ZERO
    )

    points = []
    for year, month in _month_range(as_of, months):
        _, end = month_bounds(year, month)
        activity_total = _sum(db, Transaction.date < end)
        points.append(
            {"month": f"{year:04d}-{month:02d}", "net_worth": starting_total + activity_total}
        )
    return points
