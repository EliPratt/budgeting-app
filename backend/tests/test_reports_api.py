from fastapi.testclient import TestClient


def _account(client: TestClient) -> dict:
    return client.post(
        "/api/accounts", json={"name": "Checking", "type": "checking", "starting_balance": "500"}
    ).json()


def _envelope(client: TestClient, name: str = "Groceries") -> dict:
    return client.post("/api/envelopes", json={"name": name}).json()


def _txn(client: TestClient, account_id: int, txn_date: str, amount: str, envelope_id=None) -> dict:
    payload = {"account_id": account_id, "date": txn_date, "amount": amount, "payee": "Test"}
    if envelope_id is not None:
        payload["envelope_id"] = envelope_id
    return client.post("/api/transactions", json=payload).json()


def test_spending_by_category_requires_auth(client: TestClient) -> None:
    response = client.get("/api/reports/spending-by-category")
    assert response.status_code == 401


def test_spending_by_category_with_explicit_range(auth_client: TestClient) -> None:
    account = _account(auth_client)
    envelope = _envelope(auth_client)
    _txn(auth_client, account["id"], "2026-01-05", "-40.00", envelope["id"])

    response = auth_client.get(
        "/api/reports/spending-by-category", params={"start": "2026-01-01", "end": "2026-02-01"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body == [{"envelope_id": envelope["id"], "envelope_name": "Groceries", "total": "40.00"}]


def test_income_vs_expense_trend(auth_client: TestClient) -> None:
    account = _account(auth_client)
    _txn(auth_client, account["id"], "2026-01-05", "1000.00")
    _txn(auth_client, account["id"], "2026-01-10", "-200.00")

    response = auth_client.get("/api/reports/income-vs-expense", params={"months": 1})
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_income_vs_expense_trend_rejects_out_of_range_months(auth_client: TestClient) -> None:
    response = auth_client.get("/api/reports/income-vs-expense", params={"months": 100})
    assert response.status_code == 422


def test_net_worth_trend(auth_client: TestClient) -> None:
    _account(auth_client)
    response = auth_client.get("/api/reports/net-worth", params={"months": 3})
    assert response.status_code == 200
    assert len(response.json()) == 3
