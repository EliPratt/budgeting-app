import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category_rule import CategoryRule


def match_envelope(db: Session, payee: str) -> int | None:
    rules = db.scalars(
        select(CategoryRule).order_by(CategoryRule.priority.desc(), CategoryRule.id)
    ).all()
    for rule in rules:
        if rule.match_type == "regex":
            if re.search(rule.pattern, payee, re.IGNORECASE):
                return rule.envelope_id
        elif rule.pattern.lower() in payee.lower():
            return rule.envelope_id
    return None
