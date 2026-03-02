"""Policy management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.auth import get_current_user
from src.db.database import get_db
from src.models.models import ExtractedCoverage, Policy
from src.schemas import ExtractedCoverageOut, PolicyOut
from src.services import vectorstore

router = APIRouter(
    prefix="/api/policies",
    tags=["policies"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/client/{client_id}", response_model=list[PolicyOut])
async def list_policies(client_id: str, db: AsyncSession = Depends(get_db)):
    """List all policies for a client."""
    stmt = (
        select(Policy)
        .where(Policy.client_id == client_id)
        .order_by(Policy.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{policy_id}", response_model=PolicyOut)
async def get_policy(policy_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single policy by ID."""
    policy = await db.get(Policy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy


@router.get("/{policy_id}/coverages", response_model=list[ExtractedCoverageOut])
async def get_policy_coverages(policy_id: str, db: AsyncSession = Depends(get_db)):
    """Get extracted coverage data for a policy."""
    policy = await db.get(Policy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    stmt = (
        select(ExtractedCoverage)
        .where(ExtractedCoverage.policy_id == policy_id)
        .order_by(ExtractedCoverage.coverage_name)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.delete("/{policy_id}", status_code=204)
async def delete_policy(policy_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a policy and its associated data."""
    policy = await db.get(Policy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    # Clean up vector store
    try:
        collection_name = f"client_{policy.client_id}"
        await vectorstore.delete_policy_chunks(collection_name, policy_id)
    except Exception:
        pass  # Non-critical if vector cleanup fails

    await db.delete(policy)


@router.post("/{policy_id}/reprocess", response_model=PolicyOut)
async def reprocess_policy(
    policy_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Re-trigger processing for a policy (e.g., after a parsing error)."""

    policy = await db.get(Policy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    policy.status = "uploaded"
    await db.flush()
    await db.refresh(policy)

    # Import here to avoid circular dependency
    import asyncio

    from src.routers.upload import _process_policy_background
    asyncio.create_task(_process_policy_background(policy_id))

    return policy
