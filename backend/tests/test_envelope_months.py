from fastapi.testclient import TestClient


def _create_account(client: TestClient, name: str = "Checking") -> dict:
    return client.post(
        "/api/accounts", json={"name": name, "type": "checking", "starting_balance": "0"}
    ).json()


def _create_envelope(client: TestClient, name: str = "Groceries") -> dict:
    return client.post("/api/envelopes", json={"name": name}).json()


def _add_transaction(
    client: TestClient, account_id: int, date: str, amount: str, envelope_id: int | None = None
) -> dict:
    payload = {"account_id": account_id, "date": date, "amount": amount, "payee": "Test"}
    if envelope_id is not None:
        payload["envelope_id"] = envelope_id
    return client.post("/api/transactions", json=payload).json()


def test_get_month_overview_requires_auth(client: TestClient) -> None:
    response = client.get("/api/months/2026/1")
    assert response.status_code == 401


def test_new_month_shows_zero_assigned_activity_and_available(auth_client: TestClient) -> None:
    _create_envelope(auth_client, "Groceries")
    response = auth_client.get("/api/months/2026/1")
    assert response.status_code == 200
    body = response.json()
    envelope = next(e for e in body["envelopes"] if e["name"] == "Groceries")
    assert envelope["assigned"] == "0.00"
    assert envelope["activity"] == "0.00"
    assert envelope["available"] == "0.00"


def test_assigning_an_amount_updates_available(auth_client: TestClient) -> None:
    envelope = _create_envelope(auth_client, "Groceries")
    response = auth_client.put(
        f"/api/months/2026/1/envelopes/{envelope['id']}", json={"assigned_amount": "200.00"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["assigned"] == "200.00"
    assert body["available"] == "200.00"


def test_reassigning_updates_the_existing_amount(auth_client: TestClient) -> None:
    envelope = _create_envelope(auth_client, "Groceries")
    auth_client.put(
        f"/api/months/2026/1/envelopes/{envelope['id']}", json={"assigned_amount": "200.00"}
    )
    response = auth_client.put(
        f"/api/months/2026/1/envelopes/{envelope['id']}", json={"assigned_amount": "150.00"}
    )
    assert response.json()["assigned"] == "150.00"

    overview = auth_client.get("/api/months/2026/1").json()
    matches = [e for e in overview["envelopes"] if e["id"] == envelope["id"]]
    assert len(matches) == 1
    assert matches[0]["assigned"] == "150.00"


def test_transaction_in_month_reduces_available_via_activity(auth_client: TestClient) -> None:
    account = _create_account(auth_client)
    envelope = _create_envelope(auth_client, "Groceries")
    auth_client.put(
        f"/api/months/2026/1/envelopes/{envelope['id']}", json={"assigned_amount": "200.00"}
    )
    _add_transaction(auth_client, account["id"], "2026-01-10", "-25.00", envelope["id"])

    response = auth_client.get("/api/months/2026/1")
    envelope_out = next(e for e in response.json()["envelopes"] if e["id"] == envelope["id"])
    assert envelope_out["activity"] == "-25.00"
    assert envelope_out["available"] == "175.00"


def test_transaction_outside_month_does_not_affect_that_months_activity(
    auth_client: TestClient,
) -> None:
    account = _create_account(auth_client)
    envelope = _create_envelope(auth_client, "Groceries")
    _add_transaction(auth_client, account["id"], "2026-02-10", "-25.00", envelope["id"])

    response = auth_client.get("/api/months/2026/1")
    envelope_out = next(e for e in response.json()["envelopes"] if e["id"] == envelope["id"])
    assert envelope_out["activity"] == "0.00"


def test_leftover_available_rolls_over_into_the_next_month(auth_client: TestClient) -> None:
    account = _create_account(auth_client)
    envelope = _create_envelope(auth_client, "Groceries")
    auth_client.put(
        f"/api/months/2026/1/envelopes/{envelope['id']}", json={"assigned_amount": "100.00"}
    )
    _add_transaction(auth_client, account["id"], "2026-01-10", "-30.00", envelope["id"])

    february = auth_client.get("/api/months/2026/2").json()
    envelope_out = next(e for e in february["envelopes"] if e["id"] == envelope["id"])
    assert envelope_out["assigned"] == "0.00"
    assert envelope_out["activity"] == "0.00"
    assert envelope_out["available"] == "70.00"


def test_month_summary_is_balanced_when_assigned_equals_income(auth_client: TestClient) -> None:
    account = _create_account(auth_client)
    envelope = _create_envelope(auth_client, "Groceries")
    _add_transaction(auth_client, account["id"], "2026-01-01", "1000.00")
    auth_client.put(
        f"/api/months/2026/1/envelopes/{envelope['id']}", json={"assigned_amount": "1000.00"}
    )

    summary = auth_client.get("/api/months/2026/1").json()["summary"]
    assert summary["total_income"] == "1000.00"
    assert summary["total_assigned"] == "1000.00"
    assert summary["to_be_assigned"] == "0.00"
    assert summary["balanced"] is True


def test_month_summary_is_unbalanced_when_income_is_unassigned(auth_client: TestClient) -> None:
    account = _create_account(auth_client)
    _create_envelope(auth_client, "Groceries")
    _add_transaction(auth_client, account["id"], "2026-01-01", "1000.00")

    summary = auth_client.get("/api/months/2026/1").json()["summary"]
    assert summary["to_be_assigned"] == "1000.00"
    assert summary["balanced"] is False
