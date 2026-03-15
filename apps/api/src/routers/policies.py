"""Policy management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.auth import get_current_user, verify_client_ownership
from src.db.database import get_db
from src.models.models import ExtractedCoverage, Policy, User
from src.schemas import ExtractedCoverageOut, PolicyOut
from src.services import vectorstore

router = APIRouter(prefix="/api/policies", tags=["policies"])


@router.get("/client/{client_id}", response_model=list[PolicyOut])
async def list_policies(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all policies for a client."""
    await verify_client_ownership(client_id, current_user.id, db)
    stmt = (
        select(Policy)
        .where(Policy.client_id == client_id)
        .order_by(Policy.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{policy_id}", response_model=PolicyOut)
async def get_policy(
    policy_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single policy by ID."""
    policy = await db.get(Policy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    # Verify ownership through client
    await verify_client_ownership(policy.client_id, current_user.id, db)
    return policy


@router.get("/{policy_id}/coverages", response_model=list[ExtractedCoverageOut])
async def get_policy_coverages(
    policy_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get extracted coverage data for a policy."""
    policy = await db.get(Policy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    await verify_client_ownership(policy.client_id, current_user.id, db)

    stmt = (
        select(ExtractedCoverage)
        .where(ExtractedCoverage.policy_id == policy_id)
        .order_by(ExtractedCoverage.coverage_name)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.delete("/{policy_id}", status_code=204)
async def delete_policy(
    policy_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a policy and its associated data."""
    policy = await db.get(Policy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    await verify_client_ownership(policy.client_id, current_user.id, db)

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
    current_user: User = Depends(get_current_user),
):
    """Re-trigger processing for a policy (e.g., after a parsing error)."""
    policy = await db.get(Policy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    await verify_client_ownership(policy.client_id, current_user.id, db)

    policy.status = "uploaded"
    await db.flush()
    await db.refresh(policy)

    import asyncio

    from src.routers.upload import _process_policy_background
    asyncio.create_task(_process_policy_background(policy_id))

    return policy
