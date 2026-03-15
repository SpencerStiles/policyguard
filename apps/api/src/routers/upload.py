"""Policy document upload endpoints."""

import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.core.auth import get_current_user
from src.db.database import get_db
from src.models.models import Client, Policy, User
from src.schemas import PolicyOut
from src.services.analysis import process_uploaded_policy

logger = logging.getLogger("policyguard.upload")

router = APIRouter(
    prefix="/api/upload",
    tags=["upload"],
    dependencies=[Depends(get_current_user)],
)

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/x-pdf",
}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


@router.post("/{client_id}", response_model=PolicyOut, status_code=201)
async def upload_policy(
    client_id: str,
    file: UploadFile,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a policy PDF for a client.

    The file is saved to disk and a background task is spawned to parse
    and extract coverage data.
    """
    # Validate client exists and is owned by current user
    from src.core.auth import verify_client_ownership
    await verify_client_ownership(client_id, current_user.id, db)

    # Validate file type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file.content_type}' not allowed. Upload a PDF.",
        )

    # Read file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 50 MB limit")

    # Generate unique filename
    file_id = str(uuid.uuid4())
    ext = Path(file.filename or "policy.pdf").suffix or ".pdf"
    stored_filename = f"{file_id}{ext}"
    upload_dir = Path(settings.UPLOAD_DIR) / client_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / stored_filename

    # Save to disk
    with open(file_path, "wb") as f:
        f.write(content)

    # Create database record
    policy = Policy(
        client_id=client_id,
        filename=stored_filename,
        original_filename=file.filename or "policy.pdf",
        file_path=str(file_path),
        file_size=len(content),
        mime_type=file.content_type or "application/pdf",
        status="uploaded",
    )
    db.add(policy)
    await db.flush()
    await db.refresh(policy)

    logger.info(
        "Uploaded policy %s (%s) for client %s",
        policy.id,
        file.filename,
        client_id,
    )

    # Spawn background processing
    # NOTE: background_tasks runs after the response is sent.
    # For production, use a proper task queue (Celery, etc.)
    background_tasks.add_task(_process_policy_background, policy.id)

    return policy


async def _process_policy_background(policy_id: str) -> None:
    """Background task wrapper that creates its own DB session."""
    from src.db.database import async_session

    async with async_session() as db:
        try:
            await process_uploaded_policy(db, policy_id)
            await db.commit()
        except Exception:
            logger.exception("Background processing failed for policy %s", policy_id)
            await db.rollback()
