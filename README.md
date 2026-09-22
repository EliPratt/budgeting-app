# Budgeting App

A personal envelope (zero-based) budgeting app: assign every dollar of
income to a category, track spending against it, import transactions
from bank CSV/OFX exports, auto-categorize them with rules, and manage
recurring bills and savings goals.

## Stack

- **Backend:** FastAPI, SQLAlchemy, Alembic, PostgreSQL
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Recharts
- **Auth:** single-user login (JWT in an httpOnly cookie)
- **Hosting:** Render (API + Postgres), Vercel (frontend)
- **CI:** GitHub Actions (pytest, Vitest, lint, type-check)

## Local development

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
docker compose -f ../docker-compose.yml up -d   # local Postgres on :5433
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Copy `frontend/.env.example` to `frontend/.env` if the API isn't at the
default `http://localhost:8000`.

## Tests

```bash
cd backend && pytest
cd frontend && npm test
```
