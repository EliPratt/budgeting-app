"""Replace all budget data with realistic fake demo data, and create a
recruiter login alongside the existing owner account.

This is destructive: it deletes every account, envelope, transaction,
recurring bill, goal, category rule, and import batch before reseeding.
It does NOT delete or modify existing users (so the owner's login keeps
working — it will just see the demo data like everyone else, since this
app has no per-user data isolation).

Usage: RECRUITER_EMAIL=... RECRUITER_PASSWORD=... python -m scripts.seed_demo

Run this against a database you are fine with being fully replaced.
Back up first if you want the real data back afterward:
  pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d).sql
"""

import os
import sys
from datetime import date, timedelta
from decimal import Decimal

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import (
    Account,
    CategoryRule,
    Envelope,
    EnvelopeMonth,
    Goal,
    ImportBatch,
    RecurringBill,
    Transaction,
    User,
)

TODAY = date(2026, 9, 23)


def month_start(d: date) -> date:
    return d.replace(day=1)


def shift_months(d: date, delta: int) -> date:
    month_index = d.month - 1 + delta
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


def wipe_budget_data(db) -> None:
    for model in [Transaction, ImportBatch, RecurringBill, Goal, CategoryRule, EnvelopeMonth, Envelope, Account]:
        db.query(model).delete()
    db.commit()


def seed_recruiter(db) -> None:
    email = os.environ.get("RECRUITER_EMAIL")
    password = os.environ.get("RECRUITER_PASSWORD")
    if not email or not password:
        print("Set RECRUITER_EMAIL and RECRUITER_PASSWORD to also create/update that login.", file=sys.stderr)
        return
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        db.add(User(email=email, hashed_password=hash_password(password)))
        print(f"Created recruiter user {email}")
    else:
        user.hashed_password = hash_password(password)
        print(f"Updated password for {email}")
    db.commit()


def seed_budget_data(db) -> None:
    checking = Account(name="Checking", type="checking", starting_balance=Decimal("2450.00"))
    savings = Account(name="Savings", type="savings", starting_balance=Decimal("8600.00"))
    credit_card = Account(name="Credit Card", type="credit_card", starting_balance=Decimal("-320.00"))
    db.add_all([checking, savings, credit_card])
    db.flush()

    envelopes = {
        "Rent": Envelope(name="Rent", group_name="Bills"),
        "Utilities": Envelope(name="Utilities", group_name="Bills"),
        "Internet": Envelope(name="Internet", group_name="Bills"),
        "Groceries": Envelope(name="Groceries", group_name="Everyday"),
        "Dining Out": Envelope(name="Dining Out", group_name="Everyday"),
        "Transportation": Envelope(name="Transportation", group_name="Everyday"),
        "Entertainment": Envelope(name="Entertainment", group_name="Fun"),
        "Subscriptions": Envelope(name="Subscriptions", group_name="Fun"),
        "Emergency Fund": Envelope(name="Emergency Fund", group_name="Savings"),
        "Vacation": Envelope(name="Vacation", group_name="Savings"),
    }
    db.add_all(envelopes.values())
    db.flush()

    monthly_assignments = {
        "Rent": Decimal("1400.00"),
        "Utilities": Decimal("150.00"),
        "Internet": Decimal("60.00"),
        "Groceries": Decimal("500.00"),
        "Dining Out": Decimal("150.00"),
        "Transportation": Decimal("120.00"),
        "Entertainment": Decimal("80.00"),
        "Subscriptions": Decimal("45.00"),
        "Emergency Fund": Decimal("200.00"),
        "Vacation": Decimal("100.00"),
    }
    months = [shift_months(month_start(TODAY), delta) for delta in (-2, -1, 0)]
    for month in months:
        for name, amount in monthly_assignments.items():
            db.add(EnvelopeMonth(envelope_id=envelopes[name].id, month=month, assigned_amount=amount))

    transactions = [
        (-70, checking, "Rent", "Sunrise Apartments", Decimal("-1400.00")),
        (-65, checking, "Utilities", "City Power & Water", Decimal("-142.30")),
        (-64, checking, "Internet", "Comet Broadband", Decimal("-59.99")),
        (-60, checking, "Groceries", "Green Valley Market", Decimal("-84.12")),
        (-55, credit_card, "Dining Out", "Basil & Vine", Decimal("-38.50")),
        (-50, checking, "Groceries", "Green Valley Market", Decimal("-91.47")),
        (-45, credit_card, "Transportation", "Metro Transit", Decimal("-60.00")),
        (-40, checking, "Entertainment", "Ridgeline Cinema", Decimal("-24.00")),
        (-38, checking, "Subscriptions", "Streamline+", Decimal("-15.99")),
        (-35, credit_card, "Dining Out", "Noodle House", Decimal("-27.80")),
        (-30, checking, "Rent", "Sunrise Apartments", Decimal("-1400.00")),
        (-28, checking, "Utilities", "City Power & Water", Decimal("-138.90")),
        (-27, checking, "Internet", "Comet Broadband", Decimal("-59.99")),
        (-25, checking, "Groceries", "Green Valley Market", Decimal("-102.33")),
        (-20, credit_card, "Dining Out", "Basil & Vine", Decimal("-41.10")),
        (-18, checking, "Transportation", "Metro Transit", Decimal("-60.00")),
        (-14, checking, "Groceries", "Green Valley Market", Decimal("-76.20")),
        (-10, checking, "Entertainment", "Ridgeline Cinema", Decimal("-24.00")),
        (-8, checking, "Subscriptions", "Streamline+", Decimal("-15.99")),
        (-5, credit_card, "Dining Out", "Noodle House", Decimal("-19.75")),
        (-3, checking, "Groceries", "Green Valley Market", Decimal("-58.44")),
        (-1, checking, "Transportation", "Metro Transit", Decimal("-30.00")),
        (-70, checking, None, "Acme Co Payroll", Decimal("3200.00")),
        (-40, checking, None, "Acme Co Payroll", Decimal("3200.00")),
        (-10, checking, None, "Acme Co Payroll", Decimal("3200.00")),
    ]
    for offset, account, envelope_name, payee, amount in transactions:
        db.add(
            Transaction(
                account_id=account.id,
                envelope_id=envelopes[envelope_name].id if envelope_name else None,
                date=TODAY + timedelta(days=offset),
                amount=amount,
                payee=payee,
                source="manual",
            )
        )

    db.add_all(
        [
            RecurringBill(
                name="Rent",
                account_id=checking.id,
                envelope_id=envelopes["Rent"].id,
                amount=Decimal("-1400.00"),
                frequency="monthly",
                next_due_date=shift_months(month_start(TODAY), 1),
            ),
            RecurringBill(
                name="Streamline+",
                account_id=checking.id,
                envelope_id=envelopes["Subscriptions"].id,
                amount=Decimal("-15.99"),
                frequency="monthly",
                next_due_date=TODAY + timedelta(days=6),
            ),
        ]
    )

    db.add_all(
        [
            Goal(
                envelope_id=envelopes["Emergency Fund"].id,
                target_amount=Decimal("6000.00"),
                target_date=shift_months(month_start(TODAY), 6),
            ),
            Goal(
                envelope_id=envelopes["Vacation"].id,
                target_amount=Decimal("1500.00"),
                target_date=shift_months(month_start(TODAY), 4),
            ),
        ]
    )

    db.add(CategoryRule(envelope_id=envelopes["Groceries"].id, pattern="Green Valley Market"))

    db.commit()


def main() -> None:
    db = SessionLocal()
    try:
        wipe_budget_data(db)
        seed_budget_data(db)
        seed_recruiter(db)
        print("Demo data seeded.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
