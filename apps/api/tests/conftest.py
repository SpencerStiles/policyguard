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
from src.core.auth import create_access_token, hash_password
from src.db.database import Base, get_db
from src.models.models import User


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
async def auth_headers(db_session: AsyncSession) -> dict[str, str]:
    """Create a test user and return Authorization headers with a valid JWT."""
    user = User(
        email="testuser@example.com",
        hashed_password=hash_password("testpassword123"),
        full_name="Test User",
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)

    token = create_access_token(user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def authed_client(client: AsyncClient, auth_headers: dict[str, str]):
    """HTTP test client that sends auth headers with every request."""
    client.headers.update(auth_headers)
    yield client


@pytest_asyncio.fixture
async def sample_client(authed_client: AsyncClient):
    """Create and return a sample client record (authenticated)."""
    resp = await authed_client.post("/api/clients", json={
        "name": "Acme Corp",
        "industry": "Technology / SaaS",
        "description": "A test software company",
        "contact_email": "info@acme.example.com",
    })
    assert resp.status_code == 201
    return resp.json()


@pytest_asyncio.fixture
async def second_auth_headers(db_session: AsyncSession) -> dict[str, str]:
    """Create a second test user and return their Authorization headers."""
    user = User(
        email="seconduser@example.com",
        hashed_password=hash_password("testpassword123"),
        full_name="Second User",
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    token = create_access_token(user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def second_authed_client(client: AsyncClient, second_auth_headers: dict[str, str]):
    """HTTP test client authenticated as the second user."""
    client2 = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
    async with client2 as c:
        c.headers.update(second_auth_headers)
        yield c
