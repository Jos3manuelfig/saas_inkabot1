import secrets
import string
from datetime import date
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.api.deps import DB, AdminUser, CurrentUser
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.agent import VendedorAgent
from app.models.plan import Plan
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
        .options(selectinload(Tenant.subscription).selectinload(Subscription.plan), selectinload(Tenant.whatsapp_numbers))
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

    # Obtener el Plan usando lowercase para coincidir con el enum de PostgreSQL
    plan_result = await db.execute(select(Plan).where(Plan.name == body.plan.lower()))
    plan_obj = plan_result.scalar_one_or_none()
    if not plan_obj:
        # Fallback: primer plan disponible
        fallback = await db.execute(select(Plan).limit(1))
        plan_obj = fallback.scalar_one_or_none()
    plan_id = plan_obj.id if plan_obj else None
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
        .options(selectinload(Tenant.subscription).selectinload(Subscription.plan), selectinload(Tenant.whatsapp_numbers))
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
        .options(selectinload(Tenant.subscription).selectinload(Subscription.plan), selectinload(Tenant.whatsapp_numbers))
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
    return Response(data=TenantOut.model_validate(tenant).model_dump())


@router.put("/{tenant_id}", response_model=Response)
async def update_tenant(tenant_id: str, body: TenantUpdate, db: DB, _: AdminUser):
    result = await db.execute(
        select(Tenant)
        .where(Tenant.id == tenant_id)
        .options(selectinload(Tenant.subscription).selectinload(Subscription.plan), selectinload(Tenant.whatsapp_numbers))
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")

    # 1. Actualizar campos propios del Tenant
    tenant_fields = {"name", "email", "phone", "is_active"}
    for field, value in body.model_dump(exclude_none=True).items():
        if field in tenant_fields:
            setattr(tenant, field, value)

    # 2. Actualizar suscripción si llegan plan o expiry_date
    if body.plan is not None or body.expiry_date is not None:

        # Resolver plan_id si se envía nombre de plan
        new_plan_id = None
        if body.plan is not None:
            plan_result = await db.execute(select(Plan).where(Plan.name == body.plan.lower()))
            plan_obj = plan_result.scalar_one_or_none()
            if not plan_obj:
                raise HTTPException(status_code=400, detail=f"Plan '{body.plan}' no encontrado")
            new_plan_id = plan_obj.id
            print(f"[update_tenant] Plan encontrado: {plan_obj.name} id={new_plan_id}")

        today = date.today()

        # Buscar suscripción existente
        sub_result = await db.execute(
            select(Subscription).where(Subscription.tenant_id == tenant_id)
        )
        subscription = sub_result.scalar_one_or_none()

        if subscription:
            # UPDATE: modificar suscripción existente
            if new_plan_id:
                subscription.plan_id = new_plan_id
            if body.expiry_date is not None:
                subscription.end_date = body.expiry_date
            print(f"[update_tenant] Suscripcion actualizada: plan_id={subscription.plan_id} end_date={subscription.end_date}")
        else:
            # INSERT: crear nueva suscripción si no existe
            if not new_plan_id:
                # Fallback al primer plan disponible
                fb = (await db.execute(select(Plan).limit(1))).scalar_one_or_none()
                new_plan_id = fb.id if fb else None
            if new_plan_id:
                new_sub = Subscription(
                    tenant_id=tenant_id,
                    plan_id=new_plan_id,
                    start_date=today,
                    end_date=body.expiry_date or date(today.year + 1, today.month, today.day),
                    status=SubscriptionStatus.active,
                )
                db.add(new_sub)
                print(f"[update_tenant] Nueva suscripcion creada: plan_id={new_plan_id} end_date={new_sub.end_date}")

    # 3. Commit único después de todos los cambios
    await db.commit()

    # Recargar con relaciones después del commit
    result = await db.execute(
        select(Tenant)
        .where(Tenant.id == tenant_id)
        .options(selectinload(Tenant.subscription).selectinload(Subscription.plan), selectinload(Tenant.whatsapp_numbers))
    )
    tenant = result.scalar_one()
    return Response(data=TenantOut.model_validate(tenant).model_dump(), message="Tenant actualizado")


@router.post("/{tenant_id}/reset-password", response_model=Response)
async def reset_password(tenant_id: str, db: DB, _: AdminUser):
    """Genera una nueva contraseña aleatoria para el usuario client del tenant."""
    result = await db.execute(
        select(User).where(User.tenant_id == tenant_id, User.role == UserRole.client)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario del cliente no encontrado")

    new_password = _generate_password()
    user.hashed_password = hash_password(new_password)
    await db.commit()
    return Response(data={"email": user.email, "new_password": new_password}, message="Contraseña reseteada")


@router.delete("/{tenant_id}", response_model=Response)
async def delete_tenant(tenant_id: str, db: DB, _: AdminUser):
    result = await db.execute(
        select(Tenant)
        .where(Tenant.id == tenant_id)
        .options(selectinload(Tenant.subscription).selectinload(Subscription.plan), selectinload(Tenant.whatsapp_numbers))
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")

    await db.delete(tenant)
    await db.commit()
    return Response(data=None, message="Cliente eliminado")
