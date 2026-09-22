from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.category_rule import CategoryRule
from app.models.envelope import Envelope
from app.schemas.category_rule import CategoryRuleCreate, CategoryRuleOut

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.post("", response_model=CategoryRuleOut, status_code=status.HTTP_201_CREATED)
def create_category_rule(
    payload: CategoryRuleCreate, db: Session = Depends(get_db)
) -> CategoryRule:
    if db.get(Envelope, payload.envelope_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Envelope not found")
    rule = CategoryRule(**payload.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.get("", response_model=list[CategoryRuleOut])
def list_category_rules(db: Session = Depends(get_db)) -> list[CategoryRule]:
    query = select(CategoryRule).order_by(CategoryRule.priority.desc(), CategoryRule.id)
    return list(db.scalars(query))


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category_rule(rule_id: int, db: Session = Depends(get_db)) -> None:
    rule = db.get(CategoryRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    db.delete(rule)
    db.commit()
