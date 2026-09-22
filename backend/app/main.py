from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import accounts, auth, envelopes, health, months, transactions
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
