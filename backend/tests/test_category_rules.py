from sqlalchemy.orm import Session

from app.models.category_rule import CategoryRule
from app.models.envelope import Envelope
from app.services.category_rules import match_envelope


def _envelope(db_session: Session, name: str) -> Envelope:
    envelope = Envelope(name=name)
    db_session.add(envelope)
    db_session.commit()
    db_session.refresh(envelope)
    return envelope


def test_match_envelope_returns_none_when_no_rules_match(db_session: Session) -> None:
    assert match_envelope(db_session, "Trader Joes") is None


def test_match_envelope_matches_a_contains_rule_case_insensitively(db_session: Session) -> None:
    groceries = _envelope(db_session, "Groceries")
    db_session.add(
        CategoryRule(envelope_id=groceries.id, match_type="contains", pattern="trader joe")
    )
    db_session.commit()

    assert match_envelope(db_session, "TRADER JOES #123") == groceries.id


def test_match_envelope_supports_regex_rules(db_session: Session) -> None:
    bills = _envelope(db_session, "Bills")
    db_session.add(
        CategoryRule(envelope_id=bills.id, match_type="regex", pattern=r"electric|power co")
    )
    db_session.commit()

    assert match_envelope(db_session, "CityPower Co Payment") == bills.id


def test_match_envelope_resolves_conflicts_by_priority(db_session: Session) -> None:
    generic = _envelope(db_session, "Shopping")
    specific = _envelope(db_session, "Coffee")
    db_session.add_all(
        [
            CategoryRule(
                envelope_id=generic.id, match_type="contains", pattern="starbucks", priority=0
            ),
            CategoryRule(
                envelope_id=specific.id, match_type="contains", pattern="starbucks", priority=10
            ),
        ]
    )
    db_session.commit()

    assert match_envelope(db_session, "Starbucks #4521") == specific.id
