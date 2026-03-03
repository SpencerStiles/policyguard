FROM python:3.12-slim

WORKDIR /app

# System deps for PyMuPDF, psycopg, and hnswlib (chromadb)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv — much faster than pip for heavy deps (chromadb, crewai)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy lockfile first so Docker layer cache is reused when only src changes
COPY pyproject.toml uv.lock ./

# Install all runtime deps from lockfile (no dev extras)
RUN uv sync --frozen --no-dev

COPY src/ ./src/

# Data directories (volumes in production)
RUN mkdir -p /app/data/uploads /app/data/chroma /app/data/domain

ENV PYTHONUNBUFFERED=1
ENV UPLOAD_DIR=/app/data/uploads
ENV CHROMA_PERSIST_DIR=/app/data/chroma
# Activate the uv-managed venv
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
