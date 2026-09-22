from fastapi.testclient import TestClient


def _account(client: TestClient) -> dict:
    return client.post(
        "/api/accounts", json={"name": "Checking", "type": "checking", "starting_balance": "0"}
    ).json()


def _envelope(client: TestClient, name: str = "Bills") -> dict:
    return client.post("/api/envelopes", json={"name": name}).json()


def _bill_payload(account_id: int, envelope_id: int, **overrides) -> dict:
    payload = {
        "name": "Rent",
        "account_id": account_id,
        "envelope_id": envelope_id,
        "amount": "-1200.00",
        "frequency": "monthly",
        "next_due_date": "2026-01-15",
    }
    payload.update(overrides)
    return payload


def test_create_recurring_bill_requires_auth(client: TestClient) -> None:
    response = client.post("/api/recurring-bills", json=_bill_payload(1, 1))
    assert response.status_code == 401


def test_create_recurring_bill(auth_client: TestClient) -> None:
    account = _account(auth_client)
    envelope = _envelope(auth_client)
    response = auth_client.post(
        "/api/recurring-bills", json=_bill_payload(account["id"], envelope["id"])
    )
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Rent"
    assert body["frequency"] == "monthly"


def test_create_recurring_bill_rejects_unknown_account(auth_client: TestClient) -> None:
    envelope = _envelope(auth_client)
    response = auth_client.post(
        "/api/recurring-bills", json=_bill_payload(999, envelope["id"])
    )
    assert response.status_code == 404


def test_create_recurring_bill_rejects_unknown_envelope(auth_client: TestClient) -> None:
    account = _account(auth_client)
    response = auth_client.post("/api/recurring-bills", json=_bill_payload(account["id"], 999))
    assert response.status_code == 404


def test_list_recurring_bills_orders_by_next_due_date(auth_client: TestClient) -> None:
    account = _account(auth_client)
    envelope = _envelope(auth_client)
    auth_client.post(
        "/api/recurring-bills",
        json=_bill_payload(account["id"], envelope["id"], name="Later", next_due_date="2026-03-01"),
    )
    auth_client.post(
        "/api/recurring-bills",
        json=_bill_payload(
            account["id"], envelope["id"], name="Sooner", next_due_date="2026-01-01"
        ),
    )
    response = auth_client.get("/api/recurring-bills")
    names = [b["name"] for b in response.json()]
    assert names == ["Sooner", "Later"]


def test_due_bills_excludes_bills_not_yet_due(auth_client: TestClient) -> None:
    account = _account(auth_client)
    envelope = _envelope(auth_client)
    auth_client.post(
        "/api/recurring-bills",
        json=_bill_payload(
            account["id"], envelope["id"], name="Future", next_due_date="2999-01-01"
        ),
    )
    response = auth_client.get("/api/recurring-bills/due")
    names = [b["name"] for b in response.json()]
    assert "Future" not in names


def test_confirm_recurring_bill_creates_a_transaction_and_advances_due_date(
    auth_client: TestClient,
) -> None:
    account = _account(auth_client)
    envelope = _envelope(auth_client)
    bill = auth_client.post(
        "/api/recurring-bills",
        json=_bill_payload(account["id"], envelope["id"], next_due_date="2026-01-15"),
    ).json()

    response = auth_client.post(f"/api/recurring-bills/{bill['id']}/confirm")
    assert response.status_code == 200
    body = response.json()
    assert body["transaction"]["payee"] == "Rent"
    assert body["transaction"]["source"] == "recurring"
    assert body["bill"]["next_due_date"] != "2026-01-15"


def test_confirm_recurring_bill_rejects_unknown_bill(auth_client: TestClient) -> None:
    response = auth_client.post("/api/recurring-bills/999/confirm")
    assert response.status_code == 404


def test_delete_recurring_bill(auth_client: TestClient) -> None:
    account = _account(auth_client)
    envelope = _envelope(auth_client)
    bill = auth_client.post(
        "/api/recurring-bills", json=_bill_payload(account["id"], envelope["id"])
    ).json()
    response = auth_client.delete(f"/api/recurring-bills/{bill['id']}")
    assert response.status_code == 204
    assert auth_client.get("/api/recurring-bills").json() == []
