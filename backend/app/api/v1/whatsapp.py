from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from app.api.deps import DB, CurrentUser, AdminUser
from app.models.user import UserRole
from app.models.whatsapp import WhatsappNumber
from app.schemas.common import Response
from pydantic import BaseModel

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


class WhatsappNumberCreate(BaseModel):
    phone_number: str
    phone_number_id: str
    access_token: str
    display_name: str | None = None


@router.get("/{tenant_id}/status", response_model=Response)
async def whatsapp_status(tenant_id: str, db: DB, current_user: CurrentUser):
    if current_user.role != UserRole.admin and current_user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Sin acceso a este tenant")

    result = await db.execute(
        select(WhatsappNumber).where(WhatsappNumber.tenant_id == tenant_id)
    )
    numbers = result.scalars().all()

    return Response(data=[
        {
            "id": n.id,
            "phone_number": n.phone_number,
            "display_name": n.display_name,
            "phone_number_id": n.phone_number_id,
            "status": n.status,
            "bot_active": n.bot_active,
        }
        for n in numbers
    ])


@router.post("/{tenant_id}/number", response_model=Response, status_code=status.HTTP_201_CREATED)
async def register_number(tenant_id: str, body: WhatsappNumberCreate, db: DB, _: AdminUser):
    """Registra un número de WhatsApp Business (Meta) para un tenant."""
    number = WhatsappNumber(
        tenant_id=tenant_id,
        phone_number=body.phone_number,
        phone_number_id=body.phone_number_id,
        access_token=body.access_token,
        display_name=body.display_name,
    )
    db.add(number)
    await db.commit()
    await db.refresh(number)
    return Response(data={"id": number.id, "phone_number": number.phone_number}, message="Número registrado", status=201)
