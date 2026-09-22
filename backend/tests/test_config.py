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


def test_cors_origins_list_defaults_to_the_local_dev_origins() -> None:
    assert Settings().cors_origins_list == [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ]


def test_cors_origins_list_parses_a_json_array_from_the_env(monkeypatch) -> None:
    # Real deployments set this via a raw env var (Render's dashboard, a
    # platform's env config, etc.) rather than an __init__ kwarg — that's
    # the path that matters, since pydantic-settings treats env vars
    # differently from constructor args for complex-typed fields.
    monkeypatch.setenv("CORS_ORIGINS", '["https://a.example.com","https://b.example.com"]')
    assert Settings().cors_origins_list == ["https://a.example.com", "https://b.example.com"]


def test_cors_origins_list_parses_a_comma_separated_value_from_the_env(monkeypatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "https://a.example.com,https://b.example.com")
    assert Settings().cors_origins_list == ["https://a.example.com", "https://b.example.com"]


def test_cors_origins_list_parses_a_single_bare_origin_from_the_env(monkeypatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "https://budgeting-app-sepia.vercel.app")
    assert Settings().cors_origins_list == ["https://budgeting-app-sepia.vercel.app"]


def test_cors_origins_list_trims_whitespace_around_entries(monkeypatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", " https://a.example.com , https://b.example.com ")
    assert Settings().cors_origins_list == ["https://a.example.com", "https://b.example.com"]
