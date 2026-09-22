from fastapi.testclient import TestClient

from app.models.user import User


def test_login_with_correct_credentials_succeeds(client: TestClient, owner_user: User) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "owner@example.com", "password": "correct-password"},
    )
    assert response.status_code == 200
    assert response.json() == {"email": "owner@example.com"}
    assert "access_token" in response.cookies


def test_login_with_wrong_password_is_rejected(client: TestClient, owner_user: User) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "owner@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Incorrect email or password"}


def test_login_with_unknown_email_is_rejected(client: TestClient, owner_user: User) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "correct-password"},
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Incorrect email or password"}


def test_me_without_session_is_unauthorized(client: TestClient) -> None:
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_with_valid_session_returns_current_user(client: TestClient, owner_user: User) -> None:
    client.post(
        "/api/auth/login",
        json={"email": "owner@example.com", "password": "correct-password"},
    )
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json() == {"email": "owner@example.com"}


def test_logout_clears_session(client: TestClient, owner_user: User) -> None:
    client.post(
        "/api/auth/login",
        json={"email": "owner@example.com", "password": "correct-password"},
    )
    client.post("/api/auth/logout")
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_repeated_failed_logins_are_rate_limited(client: TestClient, owner_user: User) -> None:
    for _ in range(5):
        client.post(
            "/api/auth/login",
            json={"email": "owner@example.com", "password": "wrong-password"},
        )
    response = client.post(
        "/api/auth/login",
        json={"email": "owner@example.com", "password": "correct-password"},
    )
    assert response.status_code == 429
