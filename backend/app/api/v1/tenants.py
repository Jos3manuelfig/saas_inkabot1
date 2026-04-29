import secrets
import string
from datetime import date
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from app.api.deps import DB, AdminUser, CurrentUser
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.agent import VendedorAgent
from app.core.security import hash_password
from app.models.user import UserRole
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantOut, TenantCreateResponse
from app.schemas.common import Response

router = APIRouter(prefix="/tenants", tags=["tenants"])

_ALPHABET = string.ascii_letters + string.digits + "!@#$%"


def _generate_password(length: int = 10) -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(length))


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
    # Verificar que el email no esté en uso (tenant o usuario)
    existing_tenant = await db.execute(select(Tenant).where(Tenant.email == body.email))
    if existing_tenant.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe un cliente con ese email")

    existing_user = await db.execute(select(User).where(User.email == body.email))
    if existing_user.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese email")

    # Obtener el Plan — usamos CAST explícito para evitar mismatch con el enum de PostgreSQL
    plan_result = await db.execute(
        text("SELECT id FROM plans WHERE name = CAST(:name AS plantype) LIMIT 1"),
        {"name": body.plan},
    )
    plan_id = plan_result.scalar_one_or_none()
    if not plan_id:
        # Fallback: primer plan disponible
        fallback = await db.execute(text("SELECT id FROM plans LIMIT 1"))
        plan_id = fallback.scalar_one_or_none()
        if not plan_id:
            raise HTTPException(status_code=400, detail=f"Plan '{body.plan}' no encontrado. Ejecuta scripts/seed_plans.py primero.")

    # Generar contraseña
    raw_password = _generate_password()

    # 1. Crear Tenant
    tenant = Tenant(
        name=body.name,
        email=body.email,
        phone=body.phone,
        is_active=(body.status == "active"),
    )
    db.add(tenant)
    await db.flush()  # obtener tenant.id sin commit

    # 2. Crear User con rol client
    user = User(
        email=body.email,
        hashed_password=hash_password(raw_password),
        full_name=body.name,
        role=UserRole.client,
        is_active=True,
        tenant_id=tenant.id,
    )
    db.add(user)

    # 3. Crear Subscription
    today = date.today()
    end_date = body.expiry_date or date(today.year + 1, today.month, today.day)
    subscription = Subscription(
        tenant_id=tenant.id,
        plan_id=plan_id,
        start_date=today,
        end_date=end_date,
        status=SubscriptionStatus.active,
    )
    db.add(subscription)

    # 4. Crear VendedorAgent por defecto
    agent = VendedorAgent(
        tenant_id=tenant.id,
        name="Vendedor Principal",
        is_default=True,
        is_active=True,
    )
    db.add(agent)

    await db.commit()
    await db.refresh(tenant)

    # Recargar con relaciones
    result = await db.execute(
        select(Tenant)
        .where(Tenant.id == tenant.id)
        .options(selectinload(Tenant.subscription), selectinload(Tenant.whatsapp_numbers))
    )
    tenant = result.scalar_one()

    response_data = TenantCreateResponse(
        tenant=TenantOut.model_validate(tenant),
        generated_password=raw_password,
        client_email=body.email,
    )
    return Response(data=response_data.model_dump(), message="Cliente creado exitosamente", status=201)


@router.get("/{tenant_id}", response_model=Response)
async def get_tenant(tenant_id: str, db: DB, current_user: CurrentUser):
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


@router.delete("/{tenant_id}", response_model=Response)
async def delete_tenant(tenant_id: str, db: DB, _: AdminUser):
    result = await db.execute(
        select(Tenant)
        .where(Tenant.id == tenant_id)
        .options(selectinload(Tenant.subscription), selectinload(Tenant.whatsapp_numbers))
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")

    await db.delete(tenant)
    await db.commit()
    return Response(data=None, message="Cliente eliminado")
