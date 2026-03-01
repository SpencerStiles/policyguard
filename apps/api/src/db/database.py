"""Database engine, session factory, and initialisation."""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from src.config import settings

# For development, use SQLite; for production, swap to PostgreSQL.
# The config default is PostgreSQL, but we fall back to SQLite if the
# DATABASE_URL starts with "sqlite".
_url = settings.DATABASE_URL
if _url.startswith("sqlite"):
    engine = create_async_engine(_url, echo=False, connect_args={"check_same_thread": False})
else:
    engine = create_async_engine(_url, echo=False, pool_pre_ping=True)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


async def init_db() -> None:
    """Create all tables that don't yet exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:  # type: ignore[misc]
    """FastAPI dependency that yields a database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
