from datetime import date
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from app.api.deps import DB, CurrentUser
from app.core.security import verify_password, create_access_token, hash_password
from app.models.user import User, UserRole
from app.models.tenant import Tenant
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.agent import VendedorAgent
from app.models.plan import Plan
from app.schemas.auth import LoginRequest, TokenResponse, UserOut, RegisterRequest, RegisterResponse
from app.schemas.common import Response

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Response)
async def login(body: LoginRequest, db: DB):
    result = await db.execute(
        select(User).where(User.email == body.email, User.is_active == True)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    token = create_access_token(subject=user.id, extra={"role": user.role, "tenant_id": user.tenant_id})
    return Response(
        data=TokenResponse(access_token=token).model_dump(),
        message="Login exitoso",
    )


@router.post("/register", response_model=Response, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: DB):
    """Registro público desde la landing. El tenant queda inactivo hasta que
    el admin confirme el pago manualmente (mismo flujo que la creación desde el panel admin)."""
    existing_tenant = await db.execute(select(Tenant).where(Tenant.email == body.email))
    if existing_tenant.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe una cuenta con ese email")

    existing_user = await db.execute(select(User).where(User.email == body.email))
    if existing_user.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe una cuenta con ese email")

    plan_result = await db.execute(select(Plan).where(Plan.name == body.plan.lower()))
    plan_obj = plan_result.scalar_one_or_none()
    if not plan_obj:
        fallback = await db.execute(select(Plan).limit(1))
        plan_obj = fallback.scalar_one_or_none()
    if not plan_obj:
        raise HTTPException(status_code=400, detail=f"Plan '{body.plan}' no encontrado")

    tenant = Tenant(name=body.name, email=body.email, phone=body.phone, is_active=False)
    db.add(tenant)
    await db.flush()

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.name,
        role=UserRole.client,
        is_active=True,
        tenant_id=tenant.id,
    )
    db.add(user)

    today = date.today()
    subscription = Subscription(
        tenant_id=tenant.id,
        plan_id=plan_obj.id,
        start_date=today,
        end_date=date(today.year + 1, today.month, today.day),
        status=SubscriptionStatus.active,
    )
    db.add(subscription)

    agent = VendedorAgent(tenant_id=tenant.id, name="Vendedor Principal", is_default=True, is_active=True)
    db.add(agent)

    await db.commit()

    return Response(
        data=RegisterResponse(tenant_id=tenant.id, email=body.email).model_dump(),
        message="Cuenta creada. Activaremos tu acceso al confirmar el pago.",
        status=201,
    )


@router.get("/me", response_model=Response)
async def me(current_user: CurrentUser):
    return Response(data=UserOut.model_validate(current_user).model_dump())
