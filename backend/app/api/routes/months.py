from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.envelope import Envelope
from app.schemas.envelope_month import EnvelopeMonthAssign, EnvelopeSummaryOut, MonthOverviewOut
from app.services.envelope_months import (
    envelope_summary,
    month_bounds,
    month_summary,
    set_assigned_amount,
)

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/{year}/{month}", response_model=MonthOverviewOut)
def get_month_overview(year: int, month: int, db: Session = Depends(get_db)) -> dict:
    envelopes = db.scalars(select(Envelope)).all()
    return {
        "year": year,
        "month": month,
        "envelopes": [envelope_summary(db, envelope, year, month) for envelope in envelopes],
        "summary": month_summary(db, year, month),
    }


@router.put("/{year}/{month}/envelopes/{envelope_id}", response_model=EnvelopeSummaryOut)
def assign_envelope_month(
    year: int,
    month: int,
    envelope_id: int,
    payload: EnvelopeMonthAssign,
    db: Session = Depends(get_db),
) -> dict:
    envelope = db.get(Envelope, envelope_id)
    if envelope is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Envelope not found")

    month_start, _ = month_bounds(year, month)
    set_assigned_amount(db, envelope_id, month_start, payload.assigned_amount)
    return envelope_summary(db, envelope, year, month)
