import json
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

    # Kept as a plain str, not list[str]: pydantic-settings tries to
    # JSON-decode any list-typed field from its raw env var *before* field
    # validators run, so a dashboard-pasted bare URL or comma-separated
    # value (neither valid JSON) crashes the app at startup with no chance
    # for a validator to normalize it. Parsing it ourselves in
    # cors_origins_list sidesteps that entirely.
    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://localhost:5175"

    @property
    def cors_origins_list(self) -> list[str]:
        value = self.cors_origins.strip()
        if value.startswith("["):
            return list(json.loads(value))
        return [origin.strip() for origin in value.split(",") if origin.strip()]

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
