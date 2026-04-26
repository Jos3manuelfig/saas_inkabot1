from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.api.deps import DB, AdminUser, CurrentUser
from app.models.tenant import Tenant
from app.models.user import UserRole
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantOut
from app.schemas.common import Response

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.get("/", response_model=Response)
async def list_tenants(db: DB, _: AdminUser):
    result = await db.execute(
        select(Tenant)
        .options(selectinload(Tenant.subscription), selectinload(Tenant.whatsapp_numbers))
        .order_by(Tenant.created_at.desc())
    )
    tenants = result.scalars().all()
    return Response(data=[TenantOut.model_validate(t).model_dump() for t in tenants])


@router.post("/", response_model=Response, status_code=status.HTTP_201_CREATED)
async def create_tenant(body: TenantCreate, db: DB, _: AdminUser):
    existing = await db.execute(select(Tenant).where(Tenant.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe un tenant con ese email")

    tenant = Tenant(**body.model_dump())
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    return Response(data=TenantOut.model_validate(tenant).model_dump(), message="Tenant creado", status=201)


@router.get("/{tenant_id}", response_model=Response)
async def get_tenant(tenant_id: str, db: DB, current_user: CurrentUser):
    # El cliente solo puede ver su propio tenant
    if current_user.role != UserRole.admin and current_user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Sin acceso a este tenant")

    result = await db.execute(
        select(Tenant)
        .where(Tenant.id == tenant_id)
        .options(selectinload(Tenant.subscription), selectinload(Tenant.whatsapp_numbers))
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
    return Response(data=TenantOut.model_validate(tenant).model_dump())


@router.put("/{tenant_id}", response_model=Response)
async def update_tenant(tenant_id: str, body: TenantUpdate, db: DB, _: AdminUser):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(tenant, field, value)

    await db.commit()
    await db.refresh(tenant)
    return Response(data=TenantOut.model_validate(tenant).model_dump(), message="Tenant actualizado")
