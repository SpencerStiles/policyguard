"""Shared pytest fixtures for the PolicyGuard API test suite."""
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Use in-memory SQLite for all tests – fast and isolated
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

os.environ.setdefault("DATABASE_URL", TEST_DATABASE_URL)
os.environ.setdefault("OPENAI_API_KEY", "sk-test-key")
os.environ.setdefault("ANTHROPIC_API_KEY", "sk-ant-test-key")
os.environ.setdefault("UPLOAD_DIR", "/tmp/policyguard_test_uploads")
os.environ.setdefault("CHROMA_PERSIST_DIR", "/tmp/policyguard_test_chroma")
os.environ.setdefault("JWT_SECRET", "test-secret-do-not-use-in-production")

from src.main import app
from src.db.database import Base, get_db


@pytest_asyncio.fixture(scope="function")
async def db_session():
    """Provide a clean async DB session backed by in-memory SQLite."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession):
    """HTTP test client with the DB dependency overridden."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def sample_client(client: AsyncClient):
    """Create and return a sample client record."""
    resp = await client.post("/api/clients", json={
        "name": "Acme Corp",
        "industry": "Technology / SaaS",
        "description": "A test software company",
        "contact_email": "info@acme.example.com",
    })
    assert resp.status_code == 200
    return resp.json()
