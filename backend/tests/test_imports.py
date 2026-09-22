from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.category_rule import CategoryRule
from app.models.envelope import Envelope
from app.models.transaction import Transaction
from app.services.imports import compute_dedupe_hash, parse_csv, parse_ofx, run_import

CSV_SAMPLE = b"""Date,Description,Amount
2026-01-05,Trader Joes,-42.50
2026-01-06,Paycheck,1500.00
"""

CSV_ALT_HEADERS = b"""Transaction Date,Merchant,Amount
2026-01-05,Trader Joes,-42.50
"""


def _account(db_session: Session) -> Account:
    account = Account(name="Checking", type="checking", starting_balance=Decimal("0"))
    db_session.add(account)
    db_session.commit()
    db_session.refresh(account)
    return account


def test_compute_dedupe_hash_is_stable_for_the_same_inputs() -> None:
    a = compute_dedupe_hash(1, date(2026, 1, 5), Decimal("-42.50"), "Trader Joes")
    b = compute_dedupe_hash(1, date(2026, 1, 5), Decimal("-42.50"), "Trader Joes")
    assert a == b


def test_compute_dedupe_hash_ignores_payee_case_and_whitespace() -> None:
    a = compute_dedupe_hash(1, date(2026, 1, 5), Decimal("-42.50"), "Trader Joes")
    b = compute_dedupe_hash(1, date(2026, 1, 5), Decimal("-42.50"), "  TRADER JOES  ")
    assert a == b


def test_compute_dedupe_hash_differs_for_different_amounts() -> None:
    a = compute_dedupe_hash(1, date(2026, 1, 5), Decimal("-42.50"), "Trader Joes")
    b = compute_dedupe_hash(1, date(2026, 1, 5), Decimal("-10.00"), "Trader Joes")
    assert a != b


def test_parse_csv_reads_date_description_amount_columns() -> None:
    rows = parse_csv(CSV_SAMPLE)
    assert len(rows) == 2
    assert rows[0].date == date(2026, 1, 5)
    assert rows[0].amount == Decimal("-42.50")
    assert rows[0].payee == "Trader Joes"


def test_parse_csv_recognizes_alternate_header_names() -> None:
    rows = parse_csv(CSV_ALT_HEADERS)
    assert rows[0].payee == "Trader Joes"
    assert rows[0].date == date(2026, 1, 5)


def test_run_import_creates_transactions_from_csv(db_session: Session) -> None:
    account = _account(db_session)
    result = run_import(db_session, account.id, "sample.csv", CSV_SAMPLE)

    assert result.batch.imported_count == 2
    assert result.batch.duplicate_count == 0
    assert len(result.created) == 2
    assert all(t.source == "import" for t in result.created)
    assert all(t.import_batch_id == result.batch.id for t in result.created)


def test_run_import_skips_duplicate_transactions_on_a_second_import(db_session: Session) -> None:
    account = _account(db_session)
    run_import(db_session, account.id, "sample.csv", CSV_SAMPLE)
    second = run_import(db_session, account.id, "sample.csv", CSV_SAMPLE)

    assert second.batch.imported_count == 0
    assert second.batch.duplicate_count == 2
    assert db_session.scalar(select(Transaction).limit(1)) is not None
    all_transactions = db_session.scalars(select(Transaction)).all()
    assert len(all_transactions) == 2


def test_run_import_applies_matching_category_rules(db_session: Session) -> None:
    account = _account(db_session)
    groceries = Envelope(name="Groceries")
    db_session.add(groceries)
    db_session.commit()
    db_session.refresh(groceries)
    db_session.add(
        CategoryRule(envelope_id=groceries.id, match_type="contains", pattern="trader joe")
    )
    db_session.commit()

    result = run_import(db_session, account.id, "sample.csv", CSV_SAMPLE)

    trader_joes_txn = next(t for t in result.created if t.payee == "Trader Joes")
    paycheck_txn = next(t for t in result.created if t.payee == "Paycheck")
    assert trader_joes_txn.envelope_id == groceries.id
    assert paycheck_txn.envelope_id is None


def test_parse_ofx_reads_transactions_from_an_ofx_file() -> None:
    ofx_content = b"""OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20260106120000
<LANGUAGE>ENG
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>USD
<BANKACCTFROM>
<BANKID>123456789
<ACCTID>987654321
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260101
<DTEND>20260106
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260105120000
<TRNAMT>-42.50
<FITID>1
<NAME>Trader Joes
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>1000.00
<DTASOF>20260106120000
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
"""
    rows = parse_ofx(ofx_content)
    assert len(rows) == 1
    assert rows[0].date == date(2026, 1, 5)
    assert rows[0].amount == Decimal("-42.50")
    assert rows[0].payee == "Trader Joes"
