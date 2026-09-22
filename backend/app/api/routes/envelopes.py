from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.envelope import Envelope
from app.schemas.envelope import EnvelopeCreate, EnvelopeOut, EnvelopeUpdate

router = APIRouter(dependencies=[Depends(get_current_user)])


def _get_or_404(db: Session, envelope_id: int) -> Envelope:
    envelope = db.get(Envelope, envelope_id)
    if envelope is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Envelope not found")
    return envelope


@router.post("", response_model=EnvelopeOut, status_code=status.HTTP_201_CREATED)
def create_envelope(payload: EnvelopeCreate, db: Session = Depends(get_db)) -> Envelope:
    envelope = Envelope(**payload.model_dump())
    db.add(envelope)
    db.commit()
    db.refresh(envelope)
    return envelope


@router.get("", response_model=list[EnvelopeOut])
def list_envelopes(db: Session = Depends(get_db)) -> list[Envelope]:
    return list(db.scalars(select(Envelope)))


@router.get("/{envelope_id}", response_model=EnvelopeOut)
def get_envelope(envelope_id: int, db: Session = Depends(get_db)) -> Envelope:
    return _get_or_404(db, envelope_id)


@router.patch("/{envelope_id}", response_model=EnvelopeOut)
def update_envelope(
    envelope_id: int, payload: EnvelopeUpdate, db: Session = Depends(get_db)
) -> Envelope:
    envelope = _get_or_404(db, envelope_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(envelope, field, value)
    db.commit()
    db.refresh(envelope)
    return envelope


@router.delete("/{envelope_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_envelope(envelope_id: int, db: Session = Depends(get_db)) -> None:
    envelope = _get_or_404(db, envelope_id)
    db.delete(envelope)
    db.commit()
