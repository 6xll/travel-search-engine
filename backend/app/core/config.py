"""Application settings loaded from environment variables."""

from enum import Enum
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class AppEnvironment(str, Enum):
    DEVELOPMENT = "development"
    PRODUCTION = "production"
    TEST = "test"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Travel Search Engine"
    app_env: AppEnvironment = AppEnvironment.DEVELOPMENT
    log_level: str = "INFO"

    database_url: str = (
        "postgresql+asyncpg://tse_user:tse_password@localhost:5432/travel_search"
    )
    database_echo: bool = False

    redis_url: str = "redis://localhost:6379/0"

    cors_origins: str = "http://localhost:3000"

    search_cache_ttl_seconds: int = 300
    journey_ttl_seconds: int = 3600
    provider_timeout_seconds: float = 8.0

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
