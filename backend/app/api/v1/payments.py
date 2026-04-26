from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from app.api.deps import DB, AdminUser, CurrentUser
from app.models.payment import Payment
from app.models.user import UserRole
from app.schemas.payment import PaymentCreate, PaymentOut
from app.schemas.common import Response

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/", response_model=Response, status_code=status.HTTP_201_CREATED)
async def create_payment(body: PaymentCreate, db: DB, current_user: AdminUser):
    payment = Payment(**body.model_dump(), registered_by=current_user.id)
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return Response(data=PaymentOut.model_validate(payment).model_dump(), message="Pago registrado", status=201)


@router.get("/{tenant_id}", response_model=Response)
async def get_payments(tenant_id: str, db: DB, current_user: CurrentUser):
    if current_user.role != UserRole.admin and current_user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Sin acceso a este tenant")

    result = await db.execute(
        select(Payment)
        .where(Payment.tenant_id == tenant_id)
        .order_by(Payment.payment_date.desc())
    )
    payments = result.scalars().all()
    return Response(data=[PaymentOut.model_validate(p).model_dump() for p in payments])
