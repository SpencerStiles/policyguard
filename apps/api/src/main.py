"""PolicyGuard AI - FastAPI application entry point."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from src.config import settings
from src.core.logging import get_logger, setup_logging
from src.db.database import init_db
from src.routers import analysis, auth, clients, policies, reports, upload

setup_logging()
logger = get_logger("policyguard")

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle hook."""
    logger.info("PolicyGuard API starting up")

    # Ensure required directories exist
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.CHROMA_PERSIST_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.DOMAIN_DATA_DIR).mkdir(parents=True, exist_ok=True)

    # Initialise database tables (non-fatal — app stays up for health checks)
    try:
        await init_db()
        logger.info("Database initialised")
    except Exception as exc:
        logger.warning("Database initialisation failed — app will start without DB: %s", exc)

    yield

    logger.info("PolicyGuard API shutting down")


app = FastAPI(
    title="PolicyGuard AI",
    description="Insurance policy document analysis platform — extracts structured data, flags coverage gaps and conflicts.",
    version="0.1.0",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- CORS -------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ----------------------------------------------------------------
app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(policies.router)
app.include_router(upload.router)
app.include_router(analysis.router)
app.include_router(reports.router)


# --- Health -----------------------------------------------------------------
from sqlalchemy import text
from src.db.database import async_session as _async_session


@app.get("/api/health", tags=["health"])
async def health_check():
    """Health check with database connectivity verification."""
    db_ok = False
    try:
        async with _async_session() as session:
            await session.execute(text("SELECT 1"))
            db_ok = True
    except Exception as exc:
        logger.warning("Health check DB ping failed: %s", exc)

    status = "healthy" if db_ok else "degraded"
    return {
        "status": status,
        "service": "policyguard-api",
        "version": "0.1.0",
        "database": "ok" if db_ok else "unavailable",
    }
