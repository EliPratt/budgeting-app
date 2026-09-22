from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    accounts,
    auth,
    category_rules,
    envelopes,
    health,
    imports,
    months,
    recurring_bills,
    transactions,
)
from app.core.config import settings

app = FastAPI(title="Budgeting App API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(accounts.router, prefix="/api/accounts", tags=["accounts"])
app.include_router(envelopes.router, prefix="/api/envelopes", tags=["envelopes"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"])
app.include_router(months.router, prefix="/api/months", tags=["months"])
app.include_router(imports.router, prefix="/api/imports", tags=["imports"])
app.include_router(
    category_rules.router, prefix="/api/category-rules", tags=["category-rules"]
)
app.include_router(
    recurring_bills.router, prefix="/api/recurring-bills", tags=["recurring-bills"]
)
