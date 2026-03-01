"""Application configuration loaded from environment variables."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for the PolicyGuard API.

    All values can be overridden via environment variables or a .env file
    located alongside the application root.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Database -----------------------------------------------------------
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/policyguard.db"

    # --- LLM providers ------------------------------------------------------
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"

    # --- Vector store -------------------------------------------------------
    CHROMA_PERSIST_DIR: str = str(Path.cwd() / "data" / "chroma")

    # --- File storage -------------------------------------------------------
    UPLOAD_DIR: str = str(Path.cwd() / "data" / "uploads")

    # --- Auth / Security ----------------------------------------------------
    JWT_SECRET: str = "changeme-generate-a-real-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # --- CORS ---------------------------------------------------------------
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # --- Domain data --------------------------------------------------------
    DOMAIN_DATA_DIR: str = str(Path.cwd() / "data" / "domain")

    # --- Embedding ----------------------------------------------------------
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536


settings = Settings()
