"""Goal progress: current balance vs. target, and a suggested monthly
contribution derived from the target date.

"Current balance" is the envelope's own `available` (assigned + activity,
cumulative through `as_of`'s month) — a goal doesn't track a separate pot
of money, it's a target laid on top of an envelope's existing balance.
"""

from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.orm import Session

from app.models.envelope import Envelope
from app.models.goal import Goal
from app.services.envelope_months import envelope_summary

ZERO = Decimal("0.00")


def _months_between(start: date, end: date) -> int:
    return max((end.year - start.year) * 12 + (end.month - start.month), 0)


def goal_progress(db: Session, goal: Goal, envelope: Envelope, as_of: date) -> dict:
    summary = envelope_summary(db, envelope, as_of.year, as_of.month)
    current_balance = summary["available"]
    remaining = max(goal.target_amount - current_balance, ZERO)
    months_remaining = _months_between(as_of, goal.target_date)

    if remaining <= ZERO:
        suggested_monthly_contribution = ZERO
    elif months_remaining == 0:
        suggested_monthly_contribution = remaining
    else:
        suggested_monthly_contribution = (remaining / months_remaining).quantize(
            ZERO, rounding=ROUND_HALF_UP
        )

    if goal.target_amount > ZERO:
        percent_complete = min(current_balance / goal.target_amount * 100, Decimal("100"))
    else:
        percent_complete = ZERO
    percent_complete = max(percent_complete, ZERO).quantize(ZERO, rounding=ROUND_HALF_UP)

    return {
        "current_balance": current_balance,
        "remaining": remaining,
        "months_remaining": months_remaining,
        "suggested_monthly_contribution": suggested_monthly_contribution,
        "percent_complete": percent_complete,
        "achieved": current_balance >= goal.target_amount,
    }
