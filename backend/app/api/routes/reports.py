from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.report import CategorySpendingOut, MonthlyTrendPointOut, NetWorthPointOut
from app.services.envelope_months import month_bounds
from app.services.reports import income_vs_expense_trend, net_worth_trend, spending_by_category

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/spending-by-category", response_model=list[CategorySpendingOut])
def get_spending_by_category(
    start: date | None = None,
    end: date | None = None,
    db: Session = Depends(get_db),
) -> list[dict]:
    if start is None or end is None:
        today = date.today()
        start, end = month_bounds(today.year, today.month)
    return spending_by_category(db, start, end)


@router.get("/income-vs-expense", response_model=list[MonthlyTrendPointOut])
def get_income_vs_expense_trend(
    months: int = Query(6, ge=1, le=24),
    db: Session = Depends(get_db),
) -> list[dict]:
    return income_vs_expense_trend(db, as_of=date.today(), months=months)


@router.get("/net-worth", response_model=list[NetWorthPointOut])
def get_net_worth_trend(
    months: int = Query(6, ge=1, le=24),
    db: Session = Depends(get_db),
) -> list[dict]:
    return net_worth_trend(db, as_of=date.today(), months=months)
