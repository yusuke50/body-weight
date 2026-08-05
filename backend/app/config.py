"""Runtime configuration, read from the environment (compose.yaml sets both)."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Env-backed settings. Field names map case-insensitively to env vars, so
    `database_url` is filled from `DATABASE_URL`."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Default is a relative file for running uvicorn straight on the host.
    # compose.yaml overrides it with the absolute in-container path
    # `sqlite:////data/bodyweight.db` (4 slashes) so the DB lands in the volume.
    database_url: str = "sqlite:///./bodyweight.db"

    # Comma-separated list. Must contain the Vite dev server origin for M2.
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        """Split CORS_ORIGINS into the list Starlette's middleware wants."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached so the env is read once per process."""
    return Settings()


settings = get_settings()
