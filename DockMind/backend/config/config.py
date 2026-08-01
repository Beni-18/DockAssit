"""
Centralised application configuration.

All environment variables are loaded from a ``.env`` file and validated by
pydantic-settings at startup. Fail-fast on missing required values (secrets)
prevents the application from booting with an insecure configuration.

Usage::

    from config.config import settings

    print(settings.APP_NAME)
"""

from typing import Optional

from pydantic import Field, PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application-wide settings validated against the process environment.

    Required secrets (``JWT_SECRET``, ``GEMINI_API_KEY``, ``DATABASE_URL``)
    have no default values — the application will refuse to start if they are
    absent, which is the correct behaviour for a production service.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",         # silently ignore any unexpected env vars
    )

    # ── Application ───────────────────────────────────────────────────────────
    APP_NAME: str = Field(default="DockAssist", description="Human-readable application name.")
    APP_VERSION: str = Field(default="1.0.0", description="Semantic version string.")
    ENVIRONMENT: str = Field(default="development", description="Runtime environment (development | staging | production).")

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: PostgresDsn = Field(
        ...,
        description="Full PostgreSQL connection string, e.g. postgresql://user:pass@host:5432/db.",
    )

    # ── JWT Authentication ────────────────────────────────────────────────────
    # min_length=32 enforces a minimum entropy floor for the HS256 signing key —
    # a short secret is brute-forceable offline from any single leaked token,
    # with no server involvement required. Generate one with, e.g.:
    #   python -c "import secrets; print(secrets.token_hex(32))"
    JWT_SECRET: str = Field(
        ...,
        min_length=32,
        description="Secret key used to sign and verify JWT tokens. Must be strong (32+ random chars) and kept private.",
    )
    JWT_ALGORITHM: str = Field(
        default="HS256",
        description="Algorithm used for JWT signing (e.g. HS256, RS256).",
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=1440,
        ge=1,
        description="JWT access token lifetime in minutes. Defaults to 24 hours.",
    )

    # ── AI Configuration ──────────────────────────────────────────────────────
    AI_PROVIDER: str = Field(
        default="ollama",
        description="The AI provider to use. 'ollama' or 'gemini'.",
    )
    OLLAMA_URL: str = Field(
        default="http://localhost:11434",
        description="The URL of the local Ollama instance.",
    )
    OLLAMA_MODEL: str = Field(
        default="qwen2.5:3b",
        description="The name of the Ollama model to use.",
    )
    GEMINI_API_KEY: Optional[str] = Field(
        default=None,
        description="API key for the Google Gemini SDK. Obtain from Google AI Studio. Optional if using Ollama.",
    )

    # ── Docker ────────────────────────────────────────────────────────────────
    DOCKER_HOST: Optional[str] = Field(
        default=None,
        description=(
            "Optional Docker daemon socket/URL override "
            "(e.g. unix:///var/run/docker.sock or tcp://host:2375). "
            "When unset, the SDK falls back to the standard environment-derived connection."
        ),
    )


settings = Settings()
