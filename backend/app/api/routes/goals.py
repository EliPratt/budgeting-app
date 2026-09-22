from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.envelope import Envelope
from app.models.goal import Goal
from app.schemas.goal import GoalCreate, GoalOut, GoalUpdate
from app.services.goals import goal_progress

router = APIRouter(dependencies=[Depends(get_current_user)])


def _get_or_404(db: Session, goal_id: int) -> Goal:
    goal = db.get(Goal, goal_id)
    if goal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    return goal


def _to_out(db: Session, goal: Goal, envelope: Envelope) -> GoalOut:
    progress = goal_progress(db, goal, envelope, as_of=date.today())
    return GoalOut.model_validate(
        {
            "id": goal.id,
            "envelope_id": goal.envelope_id,
            "envelope_name": envelope.name,
            "target_amount": goal.target_amount,
            "target_date": goal.target_date,
            **progress,
        }
    )


@router.post("", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(payload: GoalCreate, db: Session = Depends(get_db)) -> GoalOut:
    envelope = db.get(Envelope, payload.envelope_id)
    if envelope is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Envelope not found")
    if db.scalar(select(Goal).where(Goal.envelope_id == payload.envelope_id)) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Envelope already has a goal"
        )

    goal = Goal(**payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return _to_out(db, goal, envelope)


@router.get("", response_model=list[GoalOut])
def list_goals(db: Session = Depends(get_db)) -> list[GoalOut]:
    goals = db.scalars(select(Goal)).all()
    out = []
    for goal in goals:
        envelope = db.get(Envelope, goal.envelope_id)
        assert envelope is not None
        out.append(_to_out(db, goal, envelope))
    return out


@router.get("/{goal_id}", response_model=GoalOut)
def get_goal(goal_id: int, db: Session = Depends(get_db)) -> GoalOut:
    goal = _get_or_404(db, goal_id)
    envelope = db.get(Envelope, goal.envelope_id)
    assert envelope is not None
    return _to_out(db, goal, envelope)


@router.patch("/{goal_id}", response_model=GoalOut)
def update_goal(goal_id: int, payload: GoalUpdate, db: Session = Depends(get_db)) -> GoalOut:
    goal = _get_or_404(db, goal_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    db.commit()
    db.refresh(goal)
    envelope = db.get(Envelope, goal.envelope_id)
    assert envelope is not None
    return _to_out(db, goal, envelope)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: int, db: Session = Depends(get_db)) -> None:
    goal = _get_or_404(db, goal_id)
    db.delete(goal)
    db.commit()
