"""Envelope budgeting math.

`available` is computed as a cumulative sum rather than by walking month-to-month:

    available(envelope, Y-M) = sum(assigned_amount for month <= Y-M)
                              + sum(transaction.amount for date <= end of Y-M)

This is mathematically equivalent to carrying `available` forward one month at a
time (rollover = prior month's available), because rollover is itself just a
running total. The closed form avoids a recursive "walk back to the first
month with data" query and stays correct even for a month with no EnvelopeMonth
row of its own yet.
"""

from datetime import date
from decimal import Decimal

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.envelope import Envelope
from app.models.envelope_month import EnvelopeMonth
from app.models.transaction import Transaction


def month_bounds(year: int, month: int) -> tuple[date, date]:
    start = date(year, month, 1)
    end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    return start, end


ZERO = Decimal("0.00")


def _sum(db: Session, statement: Select) -> Decimal:
    result = db.scalar(statement)
    return Decimal(result).quantize(ZERO) if result is not None else ZERO


def get_assigned_amount(db: Session, envelope_id: int, month_start: date) -> Decimal:
    amount = db.scalar(
        select(EnvelopeMonth.assigned_amount).where(
            EnvelopeMonth.envelope_id == envelope_id, EnvelopeMonth.month == month_start
        )
    )
    return amount if amount is not None else ZERO


def set_assigned_amount(
    db: Session, envelope_id: int, month_start: date, assigned_amount: Decimal
) -> None:
    envelope_month = db.scalar(
        select(EnvelopeMonth).where(
            EnvelopeMonth.envelope_id == envelope_id, EnvelopeMonth.month == month_start
        )
    )
    if envelope_month is None:
        envelope_month = EnvelopeMonth(envelope_id=envelope_id, month=month_start)
        db.add(envelope_month)
    envelope_month.assigned_amount = assigned_amount
    db.commit()


def envelope_summary(db: Session, envelope: Envelope, year: int, month: int) -> dict:
    start, end = month_bounds(year, month)

    assigned = get_assigned_amount(db, envelope.id, start)
    activity = _sum(
        db,
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.envelope_id == envelope.id,
            Transaction.date >= start,
            Transaction.date < end,
        ),
    )
    assigned_cumulative = _sum(
        db,
        select(func.coalesce(func.sum(EnvelopeMonth.assigned_amount), 0)).where(
            EnvelopeMonth.envelope_id == envelope.id, EnvelopeMonth.month < end
        ),
    )
    activity_cumulative = _sum(
        db,
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.envelope_id == envelope.id, Transaction.date < end
        ),
    )
    available = assigned_cumulative + activity_cumulative

    return {
        "id": envelope.id,
        "name": envelope.name,
        "group_name": envelope.group_name,
        "assigned": assigned,
        "activity": activity,
        "available": available,
    }


def month_summary(db: Session, year: int, month: int) -> dict:
    start, end = month_bounds(year, month)

    total_income = _sum(
        db,
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.date >= start, Transaction.date < end, Transaction.amount > 0
        ),
    )
    total_assigned = _sum(
        db,
        select(func.coalesce(func.sum(EnvelopeMonth.assigned_amount), 0)).where(
            EnvelopeMonth.month == start
        ),
    )
    to_be_assigned = total_income - total_assigned

    return {
        "total_income": total_income,
        "total_assigned": total_assigned,
        "to_be_assigned": to_be_assigned,
        "balanced": to_be_assigned == 0,
    }
