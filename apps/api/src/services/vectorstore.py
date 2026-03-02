"""Vector store service using ChromaDB for RAG retrieval."""

import logging
from typing import Any

import chromadb
from chromadb.config import Settings as ChromaSettings

from src.config import settings

logger = logging.getLogger("policyguard.vectorstore")

_client: chromadb.ClientAPI | None = None


def get_chroma_client() -> chromadb.ClientAPI:
    """Return a singleton ChromaDB persistent client."""
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIR,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        logger.info("ChromaDB client initialised at %s", settings.CHROMA_PERSIST_DIR)
    return _client


def get_or_create_collection(name: str) -> chromadb.Collection:
    """Get or create a ChromaDB collection."""
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},
    )


async def add_chunks(
    collection_name: str,
    chunks: list[dict],
    embeddings: list[list[float]],
    policy_id: str,
) -> None:
    """Add document chunks with their embeddings to a collection.

    Args:
        collection_name: Name of the ChromaDB collection.
        chunks: List of chunk dicts from pdf_parser.chunk_document().
        embeddings: Pre-computed embedding vectors for each chunk.
        policy_id: ID of the policy these chunks belong to.
    """
    collection = get_or_create_collection(collection_name)

    ids = [f"{policy_id}_chunk_{c['chunk_index']}" for c in chunks]
    documents = [c["text"] for c in chunks]
    metadatas = [
        {
            "policy_id": policy_id,
            "source": c["source"],
            "page_numbers": str(c["page_numbers"]),
            "chunk_index": c["chunk_index"],
        }
        for c in chunks
    ]

    collection.add(
        ids=ids,
        documents=documents,
        embeddings=embeddings,  # type: ignore[arg-type]
        metadatas=metadatas,  # type: ignore[arg-type]
    )
    logger.info("Added %d chunks to collection '%s' for policy %s", len(chunks), collection_name, policy_id)


async def query_similar(
    collection_name: str,
    query_embedding: list[float],
    n_results: int = 5,
    where: dict | None = None,
) -> list[dict]:
    """Query the vector store for similar chunks.

    Args:
        collection_name: Name of the ChromaDB collection.
        query_embedding: The query embedding vector.
        n_results: Maximum number of results to return.
        where: Optional metadata filter.

    Returns:
        List of result dicts with keys: text, metadata, distance.
    """
    collection = get_or_create_collection(collection_name)

    kwargs: dict[str, Any] = {
        "query_embeddings": [query_embedding],
        "n_results": n_results,
    }
    if where:
        kwargs["where"] = where

    results = collection.query(**kwargs)

    output = []
    if results and results["documents"]:
        for i, doc in enumerate(results["documents"][0]):
            output.append({
                "text": doc,
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                "distance": results["distances"][0][i] if results["distances"] else 0,
            })

    return output


async def delete_policy_chunks(collection_name: str, policy_id: str) -> None:
    """Delete all chunks for a given policy from the collection."""
    collection = get_or_create_collection(collection_name)
    # ChromaDB supports deleting by where filter
    collection.delete(where={"policy_id": policy_id})
    logger.info("Deleted chunks for policy %s from collection '%s'", policy_id, collection_name)
