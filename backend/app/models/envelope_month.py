from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class EnvelopeMonth(Base):
    __tablename__ = "envelope_months"
    __table_args__ = (UniqueConstraint("envelope_id", "month", name="uq_envelope_month"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    envelope_id: Mapped[int] = mapped_column(ForeignKey("envelopes.id"))
    month: Mapped[date] = mapped_column(Date)
    assigned_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
