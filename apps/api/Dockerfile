FROM python:3.12-slim AS base

WORKDIR /app

# System deps for PyMuPDF and psycopg
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --no-cache-dir . 

COPY src/ ./src/

# Data directories (volumes in production)
RUN mkdir -p /app/data/uploads /app/data/chroma /app/data/domain

ENV PYTHONUNBUFFERED=1
ENV UPLOAD_DIR=/app/data/uploads
ENV CHROMA_PERSIST_DIR=/app/data/chroma

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
