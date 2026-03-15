"""Client management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.auth import get_current_user, verify_client_ownership
from src.db.database import get_db
from src.models.models import Client, Policy, User
from src.schemas import ClientCreate, ClientListOut, ClientOut, ClientUpdate

router = APIRouter(prefix="/api/clients", tags=["clients"])


@router.get("", response_model=list[ClientListOut])
async def list_clients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all clients owned by the current user, with policy counts."""
    stmt = (
        select(
            Client.id,
            Client.name,
            Client.industry,
            Client.created_at,
            func.count(Policy.id).label("policy_count"),
        )
        .outerjoin(Policy, Policy.client_id == Client.id)
        .where(Client.user_id == current_user.id)
        .group_by(Client.id)
        .order_by(Client.created_at.desc())
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [
        ClientListOut(
            id=r.id,
            name=r.name,
            industry=r.industry,
            policy_count=r.policy_count,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.post("", response_model=ClientOut, status_code=201)
async def create_client(
    data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new client owned by the current user."""
    client = Client(**data.model_dump(), user_id=current_user.id)
    db.add(client)
    await db.flush()
    await db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientOut)
async def get_client(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single client by ID."""
    return await verify_client_ownership(client_id, current_user.id, db)


@router.patch("/{client_id}", response_model=ClientOut)
async def update_client(
    client_id: str,
    data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a client."""
    client = await verify_client_ownership(client_id, current_user.id, db)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)

    await db.flush()
    await db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=204)
async def delete_client(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a client and all associated data."""
    client = await verify_client_ownership(client_id, current_user.id, db)
    await db.delete(client)
