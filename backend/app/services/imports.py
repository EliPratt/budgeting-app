"""CSV/OFX transaction import: parse -> dedupe -> auto-categorize.

The dedupe hash is sha256(account_id|date|amount|normalized payee), computed
for every transaction (manual and imported) at creation time. That means a
CSV import can detect a transaction the user already entered by hand, not
just one from a prior import.

Parsing happens entirely before anything is added to the session, so a
malformed file raises before any row is staged — an import either commits
as a whole batch or leaves no partial data behind.
"""

import hashlib
import io
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation

import pandas as pd
from ofxparse import OfxParser
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.import_batch import ImportBatch
from app.models.transaction import Transaction
from app.services.category_rules import match_envelope


@dataclass
class ParsedRow:
    date: date
    amount: Decimal
    payee: str


def compute_dedupe_hash(account_id: int, txn_date: date, amount: Decimal, payee: str) -> str:
    normalized = f"{account_id}|{txn_date.isoformat()}|{amount:.2f}|{payee.strip().lower()}"
    return hashlib.sha256(normalized.encode()).hexdigest()


_DATE_COLUMNS = ["date", "transaction date", "posted date"]
_AMOUNT_COLUMNS = ["amount"]
_PAYEE_COLUMNS = ["payee", "description", "merchant", "name"]


def _find_column(columns: list[str], candidates: list[str]) -> str:
    lowered = {c.lower().strip(): c for c in columns}
    for candidate in candidates:
        if candidate in lowered:
            return lowered[candidate]
    raise ValueError(f"Could not find a column matching one of {candidates} in {columns}")


def parse_csv(content: bytes) -> list[ParsedRow]:
    frame = pd.read_csv(io.BytesIO(content))
    columns = list(frame.columns)
    date_col = _find_column(columns, _DATE_COLUMNS)
    amount_col = _find_column(columns, _AMOUNT_COLUMNS)
    payee_col = _find_column(columns, _PAYEE_COLUMNS)

    rows = []
    for _, row in frame.iterrows():
        try:
            parsed_date = pd.to_datetime(row[date_col]).date()
            amount = Decimal(str(row[amount_col]))
        except (InvalidOperation, ValueError) as exc:
            raise ValueError(f"Could not parse row: {row.to_dict()}") from exc
        rows.append(ParsedRow(date=parsed_date, amount=amount, payee=str(row[payee_col]).strip()))
    return rows


def parse_ofx(content: bytes) -> list[ParsedRow]:
    ofx = OfxParser.parse(io.BytesIO(content))
    rows = []
    for account in ofx.accounts:
        for txn in account.statement.transactions:
            payee = (txn.payee or txn.memo or "").strip()
            amount = Decimal(str(txn.amount))
            rows.append(ParsedRow(date=txn.date.date(), amount=amount, payee=payee))
    return rows


def parse_file(filename: str, content: bytes) -> list[ParsedRow]:
    if filename.lower().endswith(".ofx"):
        return parse_ofx(content)
    return parse_csv(content)


@dataclass
class ImportResult:
    batch: ImportBatch
    created: list[Transaction]
    duplicate_count: int


def run_import(db: Session, account_id: int, filename: str, content: bytes) -> ImportResult:
    rows = parse_file(filename, content)

    batch = ImportBatch(account_id=account_id, filename=filename)
    db.add(batch)
    db.flush()

    created: list[Transaction] = []
    duplicate_count = 0

    for row in rows:
        dedupe_hash = compute_dedupe_hash(account_id, row.date, row.amount, row.payee)
        existing = db.scalar(select(Transaction).where(Transaction.dedupe_hash == dedupe_hash))
        if existing is not None:
            duplicate_count += 1
            continue

        transaction = Transaction(
            account_id=account_id,
            envelope_id=match_envelope(db, row.payee),
            date=row.date,
            amount=row.amount,
            payee=row.payee,
            source="import",
            import_batch_id=batch.id,
            dedupe_hash=dedupe_hash,
        )
        db.add(transaction)
        created.append(transaction)

    batch.imported_count = len(created)
    batch.duplicate_count = duplicate_count
    db.commit()
    for transaction in created:
        db.refresh(transaction)
    db.refresh(batch)

    return ImportResult(batch=batch, created=created, duplicate_count=duplicate_count)
