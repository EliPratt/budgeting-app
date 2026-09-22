from fastapi.testclient import TestClient


def test_create_envelope_requires_auth(client: TestClient) -> None:
    response = client.post("/api/envelopes", json={"name": "Groceries"})
    assert response.status_code == 401


def test_create_envelope_returns_the_created_envelope(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/envelopes", json={"name": "Groceries", "group_name": "Everyday"}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Groceries"
    assert body["group_name"] == "Everyday"
    assert "id" in body


def test_create_envelope_without_group_name(auth_client: TestClient) -> None:
    response = auth_client.post("/api/envelopes", json={"name": "Rent"})
    assert response.status_code == 201
    assert response.json()["group_name"] is None


def test_list_envelopes_returns_all_created_envelopes(auth_client: TestClient) -> None:
    auth_client.post("/api/envelopes", json={"name": "Groceries"})
    auth_client.post("/api/envelopes", json={"name": "Rent"})
    response = auth_client.get("/api/envelopes")
    names = {envelope["name"] for envelope in response.json()}
    assert names == {"Groceries", "Rent"}


def test_get_nonexistent_envelope_returns_404(auth_client: TestClient) -> None:
    response = auth_client.get("/api/envelopes/999")
    assert response.status_code == 404


def test_update_envelope_changes_its_group(auth_client: TestClient) -> None:
    envelope = auth_client.post("/api/envelopes", json={"name": "Groceries"}).json()
    response = auth_client.patch(
        f"/api/envelopes/{envelope['id']}", json={"group_name": "Everyday"}
    )
    assert response.status_code == 200
    assert response.json()["group_name"] == "Everyday"


def test_delete_envelope_removes_it_from_the_list(auth_client: TestClient) -> None:
    envelope = auth_client.post("/api/envelopes", json={"name": "Groceries"}).json()
    response = auth_client.delete(f"/api/envelopes/{envelope['id']}")
    assert response.status_code == 204
    assert auth_client.get("/api/envelopes").json() == []
