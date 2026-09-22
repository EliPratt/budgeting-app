import io

from fastapi.testclient import TestClient

CSV_SAMPLE = b"""Date,Description,Amount
2026-01-05,Trader Joes,-42.50
2026-01-06,Paycheck,1500.00
"""


def _account(client: TestClient) -> dict:
    return client.post(
        "/api/accounts", json={"name": "Checking", "type": "checking", "starting_balance": "0"}
    ).json()


def _upload(client: TestClient, account_id: int, content: bytes = CSV_SAMPLE) -> "any":
    return client.post(
        "/api/imports",
        data={"account_id": str(account_id)},
        files={"file": ("sample.csv", io.BytesIO(content), "text/csv")},
    )


def test_create_import_requires_auth(client: TestClient) -> None:
    response = client.post(
        "/api/imports",
        data={"account_id": "1"},
        files={"file": ("sample.csv", io.BytesIO(CSV_SAMPLE), "text/csv")},
    )
    assert response.status_code == 401


def test_create_import_parses_and_creates_transactions(auth_client: TestClient) -> None:
    account = _account(auth_client)
    response = _upload(auth_client, account["id"])
    assert response.status_code == 201
    body = response.json()
    assert body["batch"]["imported_count"] == 2
    assert body["batch"]["duplicate_count"] == 0
    assert len(body["created"]) == 2


def test_create_import_rejects_unknown_account(auth_client: TestClient) -> None:
    response = _upload(auth_client, 999)
    assert response.status_code == 404


def test_create_import_rejects_a_malformed_csv(auth_client: TestClient) -> None:
    account = _account(auth_client)
    response = _upload(auth_client, account["id"], content=b"not,a,valid,header\n1,2,3,4\n")
    assert response.status_code == 400


def test_second_import_of_the_same_file_reports_duplicates(auth_client: TestClient) -> None:
    account = _account(auth_client)
    _upload(auth_client, account["id"])
    response = _upload(auth_client, account["id"])
    body = response.json()
    assert body["batch"]["imported_count"] == 0
    assert body["batch"]["duplicate_count"] == 2


def test_imported_transactions_show_up_in_the_transactions_list(auth_client: TestClient) -> None:
    account = _account(auth_client)
    _upload(auth_client, account["id"])
    response = auth_client.get("/api/transactions", params={"account_id": account["id"]})
    payees = {t["payee"] for t in response.json()}
    assert payees == {"Trader Joes", "Paycheck"}
