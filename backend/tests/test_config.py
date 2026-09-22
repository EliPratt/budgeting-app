from app.core.config import Settings


def test_database_url_defaults_to_the_psycopg_dialect() -> None:
    settings = Settings()
    assert settings.database_url.startswith("postgresql+psycopg://")


def test_database_url_normalizes_a_bare_postgres_scheme() -> None:
    settings = Settings(database_url="postgres://user:pass@host:5432/db")
    assert settings.database_url == "postgresql+psycopg://user:pass@host:5432/db"


def test_database_url_normalizes_a_bare_postgresql_scheme() -> None:
    settings = Settings(database_url="postgresql://user:pass@host:5432/db")
    assert settings.database_url == "postgresql+psycopg://user:pass@host:5432/db"


def test_database_url_leaves_an_already_qualified_scheme_alone() -> None:
    settings = Settings(database_url="postgresql+psycopg://user:pass@host:5432/db")
    assert settings.database_url == "postgresql+psycopg://user:pass@host:5432/db"


def test_cookie_samesite_defaults_to_lax() -> None:
    assert Settings().cookie_samesite == "lax"


def test_cors_origins_accepts_a_json_array_string() -> None:
    settings = Settings(cors_origins='["https://a.example.com","https://b.example.com"]')
    assert settings.cors_origins == ["https://a.example.com", "https://b.example.com"]


def test_cors_origins_accepts_a_comma_separated_string() -> None:
    settings = Settings(cors_origins="https://a.example.com,https://b.example.com")
    assert settings.cors_origins == ["https://a.example.com", "https://b.example.com"]


def test_cors_origins_accepts_a_single_bare_origin() -> None:
    settings = Settings(cors_origins="https://budgeting-app-sepia.vercel.app")
    assert settings.cors_origins == ["https://budgeting-app-sepia.vercel.app"]


def test_cors_origins_trims_whitespace_around_entries() -> None:
    settings = Settings(cors_origins=" https://a.example.com , https://b.example.com ")
    assert settings.cors_origins == ["https://a.example.com", "https://b.example.com"]
