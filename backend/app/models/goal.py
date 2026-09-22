from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(primary_key=True)
    envelope_id: Mapped[int] = mapped_column(ForeignKey("envelopes.id"), unique=True)
    target_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    target_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
