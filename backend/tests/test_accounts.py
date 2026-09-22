from fastapi.testclient import TestClient


def test_create_account_requires_auth(client: TestClient) -> None:
    response = client.post(
        "/api/accounts",
        json={"name": "Checking", "type": "checking", "starting_balance": "100.00"},
    )
    assert response.status_code == 401


def test_create_account_returns_the_created_account(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/accounts",
        json={"name": "Checking", "type": "checking", "starting_balance": "100.00"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Checking"
    assert body["type"] == "checking"
    assert body["starting_balance"] == "100.00"
    assert body["balance"] == "100.00"
    assert "id" in body


def test_create_account_rejects_invalid_type(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/accounts",
        json={"name": "Checking", "type": "bogus", "starting_balance": "0"},
    )
    assert response.status_code == 422


def test_list_accounts_returns_all_created_accounts(auth_client: TestClient) -> None:
    auth_client.post(
        "/api/accounts", json={"name": "Checking", "type": "checking", "starting_balance": "0"}
    )
    auth_client.post(
        "/api/accounts", json={"name": "Savings", "type": "savings", "starting_balance": "500"}
    )
    response = auth_client.get("/api/accounts")
    assert response.status_code == 200
    names = {account["name"] for account in response.json()}
    assert names == {"Checking", "Savings"}


def test_get_account_balance_reflects_transactions(auth_client: TestClient) -> None:
    account = auth_client.post(
        "/api/accounts", json={"name": "Checking", "type": "checking", "starting_balance": "100"}
    ).json()
    auth_client.post(
        "/api/transactions",
        json={
            "account_id": account["id"],
            "date": "2026-01-05",
            "amount": "-25.00",
            "payee": "Grocery Store",
        },
    )
    response = auth_client.get(f"/api/accounts/{account['id']}")
    assert response.json()["balance"] == "75.00"


def test_get_nonexistent_account_returns_404(auth_client: TestClient) -> None:
    response = auth_client.get("/api/accounts/999")
    assert response.status_code == 404


def test_update_account_changes_its_name(auth_client: TestClient) -> None:
    account = auth_client.post(
        "/api/accounts", json={"name": "Checking", "type": "checking", "starting_balance": "0"}
    ).json()
    response = auth_client.patch(f"/api/accounts/{account['id']}", json={"name": "Main Checking"})
    assert response.status_code == 200
    assert response.json()["name"] == "Main Checking"


def test_delete_account_removes_it_from_the_list(auth_client: TestClient) -> None:
    account = auth_client.post(
        "/api/accounts", json={"name": "Checking", "type": "checking", "starting_balance": "0"}
    ).json()
    response = auth_client.delete(f"/api/accounts/{account['id']}")
    assert response.status_code == 204
    assert auth_client.get("/api/accounts").json() == []
