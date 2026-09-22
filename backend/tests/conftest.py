from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.rate_limit import LoginRateLimiter, get_login_rate_limiter
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import User


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    rate_limiter = LoginRateLimiter(max_attempts=5, window_seconds=60)

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_login_rate_limiter] = lambda: rate_limiter
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def owner_user(db_session: Session) -> User:
    user = User(email="owner@example.com", hashed_password=hash_password("correct-password"))
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_client(client: TestClient, owner_user: User) -> TestClient:
    response = client.post(
        "/api/auth/login",
        json={"email": owner_user.email, "password": "correct-password"},
    )
    assert response.status_code == 200
    return client
