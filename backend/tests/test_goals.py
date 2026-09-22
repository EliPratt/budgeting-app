from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.envelope import Envelope
from app.models.envelope_month import EnvelopeMonth
from app.models.goal import Goal
from app.services.goals import goal_progress


def _envelope(db_session: Session) -> Envelope:
    envelope = Envelope(name="Emergency Fund")
    db_session.add(envelope)
    db_session.commit()
    db_session.refresh(envelope)
    return envelope


def _assign(db_session: Session, envelope: Envelope, month: date, amount: str) -> None:
    db_session.add(
        EnvelopeMonth(envelope_id=envelope.id, month=month, assigned_amount=Decimal(amount))
    )
    db_session.commit()


def _goal(
    db_session: Session, envelope: Envelope, target_amount: str, target_date: date
) -> Goal:
    goal = Goal(
        envelope_id=envelope.id, target_amount=Decimal(target_amount), target_date=target_date
    )
    db_session.add(goal)
    db_session.commit()
    db_session.refresh(goal)
    return goal


def test_goal_progress_reports_current_balance_from_the_envelope(db_session: Session) -> None:
    envelope = _envelope(db_session)
    _assign(db_session, envelope, date(2026, 1, 1), "300.00")
    goal = _goal(db_session, envelope, "1000.00", date(2026, 12, 1))

    progress = goal_progress(db_session, goal, envelope, as_of=date(2026, 1, 15))

    assert progress["current_balance"] == Decimal("300.00")
    assert progress["remaining"] == Decimal("700.00")


def test_goal_progress_computes_percent_complete(db_session: Session) -> None:
    envelope = _envelope(db_session)
    _assign(db_session, envelope, date(2026, 1, 1), "250.00")
    goal = _goal(db_session, envelope, "1000.00", date(2026, 12, 1))

    progress = goal_progress(db_session, goal, envelope, as_of=date(2026, 1, 15))

    assert progress["percent_complete"] == Decimal("25.00")


def test_goal_progress_clamps_percent_complete_at_100(db_session: Session) -> None:
    envelope = _envelope(db_session)
    _assign(db_session, envelope, date(2026, 1, 1), "1500.00")
    goal = _goal(db_session, envelope, "1000.00", date(2026, 12, 1))

    progress = goal_progress(db_session, goal, envelope, as_of=date(2026, 1, 15))

    assert progress["percent_complete"] == Decimal("100.00")
    assert progress["achieved"] is True
    assert progress["remaining"] == Decimal("0.00")


def test_goal_progress_clamps_percent_complete_at_zero_for_a_negative_balance(
    db_session: Session,
) -> None:
    envelope = _envelope(db_session)
    goal = _goal(db_session, envelope, "1000.00", date(2026, 12, 1))

    progress = goal_progress(db_session, goal, envelope, as_of=date(2026, 1, 15))

    assert progress["percent_complete"] == Decimal("0.00")
    assert progress["achieved"] is False


def test_goal_progress_suggests_a_monthly_contribution_split_across_remaining_months(
    db_session: Session,
) -> None:
    envelope = _envelope(db_session)
    _assign(db_session, envelope, date(2026, 1, 1), "0.00")
    goal = _goal(db_session, envelope, "1200.00", date(2026, 7, 1))

    progress = goal_progress(db_session, goal, envelope, as_of=date(2026, 1, 1))

    assert progress["months_remaining"] == 6
    assert progress["suggested_monthly_contribution"] == Decimal("200.00")


def test_goal_progress_suggests_the_full_remainder_when_the_target_month_has_arrived(
    db_session: Session,
) -> None:
    envelope = _envelope(db_session)
    goal = _goal(db_session, envelope, "500.00", date(2026, 1, 1))

    progress = goal_progress(db_session, goal, envelope, as_of=date(2026, 1, 15))

    assert progress["months_remaining"] == 0
    assert progress["suggested_monthly_contribution"] == Decimal("500.00")


def test_goal_progress_suggests_zero_once_the_goal_is_achieved(db_session: Session) -> None:
    envelope = _envelope(db_session)
    _assign(db_session, envelope, date(2026, 1, 1), "1000.00")
    goal = _goal(db_session, envelope, "1000.00", date(2026, 12, 1))

    progress = goal_progress(db_session, goal, envelope, as_of=date(2026, 1, 15))

    assert progress["suggested_monthly_contribution"] == Decimal("0.00")
