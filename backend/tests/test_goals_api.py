from fastapi.testclient import TestClient


def _envelope(client: TestClient, name: str = "Emergency Fund") -> dict:
    return client.post("/api/envelopes", json={"name": name}).json()


def _goal_payload(envelope_id: int, **overrides) -> dict:
    payload = {"envelope_id": envelope_id, "target_amount": "1000.00", "target_date": "2026-12-01"}
    payload.update(overrides)
    return payload


def test_create_goal_requires_auth(client: TestClient) -> None:
    response = client.post("/api/goals", json=_goal_payload(1))
    assert response.status_code == 401


def test_create_goal(auth_client: TestClient) -> None:
    envelope = _envelope(auth_client)
    response = auth_client.post("/api/goals", json=_goal_payload(envelope["id"]))
    assert response.status_code == 201
    body = response.json()
    assert body["envelope_name"] == "Emergency Fund"
    assert body["target_amount"] == "1000.00"
    assert body["current_balance"] == "0.00"
    assert body["achieved"] is False


def test_create_goal_rejects_unknown_envelope(auth_client: TestClient) -> None:
    response = auth_client.post("/api/goals", json=_goal_payload(999))
    assert response.status_code == 404


def test_create_goal_rejects_a_second_goal_on_the_same_envelope(auth_client: TestClient) -> None:
    envelope = _envelope(auth_client)
    auth_client.post("/api/goals", json=_goal_payload(envelope["id"]))
    response = auth_client.post(
        "/api/goals",
        json=_goal_payload(envelope["id"], target_amount="500.00", target_date="2026-06-01"),
    )
    assert response.status_code == 409


def test_create_goal_rejects_a_non_positive_target_amount(auth_client: TestClient) -> None:
    envelope = _envelope(auth_client)
    response = auth_client.post(
        "/api/goals", json=_goal_payload(envelope["id"], target_amount="0.00")
    )
    assert response.status_code == 422


def test_list_goals(auth_client: TestClient) -> None:
    envelope = _envelope(auth_client)
    auth_client.post("/api/goals", json=_goal_payload(envelope["id"]))
    response = auth_client.get("/api/goals")
    assert len(response.json()) == 1


def test_get_goal(auth_client: TestClient) -> None:
    envelope = _envelope(auth_client)
    goal = auth_client.post("/api/goals", json=_goal_payload(envelope["id"])).json()
    response = auth_client.get(f"/api/goals/{goal['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == goal["id"]


def test_get_goal_rejects_unknown_id(auth_client: TestClient) -> None:
    response = auth_client.get("/api/goals/999")
    assert response.status_code == 404


def test_update_goal_changes_the_target(auth_client: TestClient) -> None:
    envelope = _envelope(auth_client)
    goal = auth_client.post("/api/goals", json=_goal_payload(envelope["id"])).json()
    response = auth_client.patch(f"/api/goals/{goal['id']}", json={"target_amount": "2000.00"})
    assert response.status_code == 200
    assert response.json()["target_amount"] == "2000.00"


def test_delete_goal(auth_client: TestClient) -> None:
    envelope = _envelope(auth_client)
    goal = auth_client.post("/api/goals", json=_goal_payload(envelope["id"])).json()
    response = auth_client.delete(f"/api/goals/{goal['id']}")
    assert response.status_code == 204
    assert auth_client.get("/api/goals").json() == []
