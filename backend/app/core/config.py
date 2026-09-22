from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://budgeting:budgeting@localhost:5433/budgeting"
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ]

    @field_validator("database_url")
    @classmethod
    def _use_psycopg_dialect(cls, value: str) -> str:
        """Managed Postgres providers (Render included) hand out a bare
        postgres:// or postgresql:// URL; SQLAlchemy needs the +psycopg
        dialect suffix to use psycopg3. Normalizing here means that URL
        can be pasted into DATABASE_URL as-is.
        """
        if value.startswith("postgres://"):
            return "postgresql+psycopg://" + value.removeprefix("postgres://")
        if value.startswith("postgresql://"):
            return "postgresql+psycopg://" + value.removeprefix("postgresql://")
        return value


settings = Settings()
