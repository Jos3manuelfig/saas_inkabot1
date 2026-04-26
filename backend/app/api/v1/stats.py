from typing import Annotated
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import DB, AdminUser, CurrentUser, get_db
from app.core.database import get_n8n_db
from app.models.user import UserRole
from app.schemas.common import Response
from app.services.n8n_reader import N8nReader

router = APIRouter(prefix="/stats", tags=["stats"])

N8nDB = Annotated[AsyncSession, Depends(get_n8n_db)]


@router.get("/global", response_model=Response)
async def global_stats(db: DB, n8n_db: N8nDB, _: AdminUser):
    reader = N8nReader(db, n8n_db)
    stats = await reader.get_global_stats()
    return Response(data=stats.model_dump())


@router.get("/{tenant_id}", response_model=Response)
async def tenant_stats(tenant_id: str, db: DB, n8n_db: N8nDB, current_user: CurrentUser):
    if current_user.role != UserRole.admin and current_user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Sin acceso a este tenant")

    reader = N8nReader(db, n8n_db)
    stats = await reader.get_tenant_stats(tenant_id)
    return Response(data=stats.model_dump())
