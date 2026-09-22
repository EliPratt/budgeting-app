from fastapi.testclient import TestClient


def _envelope(client: TestClient, name: str = "Groceries") -> dict:
    return client.post("/api/envelopes", json={"name": name}).json()


def test_create_category_rule_requires_auth(client: TestClient) -> None:
    response = client.post(
        "/api/category-rules", json={"envelope_id": 1, "pattern": "trader joe"}
    )
    assert response.status_code == 401


def test_create_category_rule(auth_client: TestClient) -> None:
    envelope = _envelope(auth_client)
    response = auth_client.post(
        "/api/category-rules",
        json={"envelope_id": envelope["id"], "pattern": "trader joe", "priority": 5},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["match_type"] == "contains"
    assert body["priority"] == 5


def test_create_category_rule_rejects_unknown_envelope(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/category-rules", json={"envelope_id": 999, "pattern": "trader joe"}
    )
    assert response.status_code == 404


def test_list_category_rules_orders_by_priority_desc(auth_client: TestClient) -> None:
    envelope = _envelope(auth_client)
    auth_client.post(
        "/api/category-rules",
        json={"envelope_id": envelope["id"], "pattern": "low", "priority": 1},
    )
    auth_client.post(
        "/api/category-rules",
        json={"envelope_id": envelope["id"], "pattern": "high", "priority": 10},
    )
    response = auth_client.get("/api/category-rules")
    patterns = [r["pattern"] for r in response.json()]
    assert patterns == ["high", "low"]


def test_delete_category_rule(auth_client: TestClient) -> None:
    envelope = _envelope(auth_client)
    rule = auth_client.post(
        "/api/category-rules", json={"envelope_id": envelope["id"], "pattern": "trader joe"}
    ).json()
    response = auth_client.delete(f"/api/category-rules/{rule['id']}")
    assert response.status_code == 204
    assert auth_client.get("/api/category-rules").json() == []
