from fastapi.testclient import TestClient


def _create_account(client: TestClient, name: str = "Checking") -> dict:
    return client.post(
        "/api/accounts", json={"name": name, "type": "checking", "starting_balance": "0"}
    ).json()


def _create_envelope(client: TestClient, name: str = "Groceries") -> dict:
    return client.post("/api/envelopes", json={"name": name}).json()


def test_create_transaction_requires_auth(client: TestClient) -> None:
    response = client.post(
        "/api/transactions",
        json={"account_id": 1, "date": "2026-01-01", "amount": "-10", "payee": "Store"},
    )
    assert response.status_code == 401


def test_create_transaction_defaults_to_manual_source_and_no_envelope(
    auth_client: TestClient,
) -> None:
    account = _create_account(auth_client)
    response = auth_client.post(
        "/api/transactions",
        json={
            "account_id": account["id"],
            "date": "2026-01-05",
            "amount": "-42.50",
            "payee": "Grocery Store",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["source"] == "manual"
    assert body["envelope_id"] is None
    assert body["amount"] == "-42.50"


def test_create_transaction_can_assign_an_envelope(auth_client: TestClient) -> None:
    account = _create_account(auth_client)
    envelope = _create_envelope(auth_client)
    response = auth_client.post(
        "/api/transactions",
        json={
            "account_id": account["id"],
            "date": "2026-01-05",
            "amount": "-10",
            "payee": "Store",
            "envelope_id": envelope["id"],
        },
    )
    assert response.json()["envelope_id"] == envelope["id"]


def test_create_transaction_rejects_unknown_account(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/transactions",
        json={"account_id": 999, "date": "2026-01-05", "amount": "-10", "payee": "Store"},
    )
    assert response.status_code == 404


def test_create_transaction_rejects_unknown_envelope(auth_client: TestClient) -> None:
    account = _create_account(auth_client)
    response = auth_client.post(
        "/api/transactions",
        json={
            "account_id": account["id"],
            "date": "2026-01-05",
            "amount": "-10",
            "payee": "Store",
            "envelope_id": 999,
        },
    )
    assert response.status_code == 404


def test_list_transactions_filters_by_account(auth_client: TestClient) -> None:
    account_a = _create_account(auth_client, "Checking")
    account_b = _create_account(auth_client, "Savings")
    auth_client.post(
        "/api/transactions",
        json={"account_id": account_a["id"], "date": "2026-01-05", "amount": "-10", "payee": "A"},
    )
    auth_client.post(
        "/api/transactions",
        json={"account_id": account_b["id"], "date": "2026-01-05", "amount": "-20", "payee": "B"},
    )
    response = auth_client.get("/api/transactions", params={"account_id": account_a["id"]})
    payees = [t["payee"] for t in response.json()]
    assert payees == ["A"]


def test_update_transaction_assigns_an_envelope(auth_client: TestClient) -> None:
    account = _create_account(auth_client)
    envelope = _create_envelope(auth_client)
    transaction = auth_client.post(
        "/api/transactions",
        json={"account_id": account["id"], "date": "2026-01-05", "amount": "-10", "payee": "A"},
    ).json()
    response = auth_client.patch(
        f"/api/transactions/{transaction['id']}", json={"envelope_id": envelope["id"]}
    )
    assert response.status_code == 200
    assert response.json()["envelope_id"] == envelope["id"]


def test_delete_transaction_removes_it_from_the_list(auth_client: TestClient) -> None:
    account = _create_account(auth_client)
    transaction = auth_client.post(
        "/api/transactions",
        json={"account_id": account["id"], "date": "2026-01-05", "amount": "-10", "payee": "A"},
    ).json()
    response = auth_client.delete(f"/api/transactions/{transaction['id']}")
    assert response.status_code == 204
    assert auth_client.get("/api/transactions").json() == []
