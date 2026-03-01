"""Embedding service using OpenAI's text-embedding API."""

import logging

from openai import AsyncOpenAI

from src.config import settings

logger = logging.getLogger("policyguard.embeddings")

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


async def get_embeddings(texts: list[str]) -> list[list[float]]:
    """Get embeddings for a list of texts using OpenAI.

    Args:
        texts: List of text strings to embed.

    Returns:
        List of embedding vectors.
    """
    if not texts:
        return []

    client = _get_client()

    # OpenAI has a limit of ~8191 tokens per text; truncate long texts
    truncated = [t[:8000] for t in texts]

    # Batch in groups of 100 to respect rate limits
    all_embeddings: list[list[float]] = []
    batch_size = 100

    for i in range(0, len(truncated), batch_size):
        batch = truncated[i : i + batch_size]
        response = await client.embeddings.create(
            model=settings.EMBEDDING_MODEL,
            input=batch,
            dimensions=settings.EMBEDDING_DIMENSIONS,
        )
        batch_embeddings = [item.embedding for item in response.data]
        all_embeddings.extend(batch_embeddings)

    logger.info("Generated %d embeddings", len(all_embeddings))
    return all_embeddings


async def get_single_embedding(text: str) -> list[float]:
    """Get a single embedding vector for a text string."""
    results = await get_embeddings([text])
    return results[0] if results else []
