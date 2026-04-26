from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from app.api.deps import DB, CurrentUser
from app.models.user import UserRole
from app.models.whatsapp import WhatsappNumber
from app.schemas.common import Response
from app.services.ycloud import YCloudService

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


@router.get("/{tenant_id}/status", response_model=Response)
async def whatsapp_status(tenant_id: str, db: DB, current_user: CurrentUser):
    if current_user.role != UserRole.admin and current_user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Sin acceso a este tenant")

    result = await db.execute(
        select(WhatsappNumber).where(WhatsappNumber.tenant_id == tenant_id)
    )
    numbers = result.scalars().all()

    if not numbers:
        return Response(data=[], message="Sin números WhatsApp registrados")

    # Consultar estado real en YCloud si hay API key configurada
    ycloud = YCloudService()
    if ycloud.is_configured:
        updated = await ycloud.sync_status(numbers, db)
        await db.commit()
        numbers = updated

    return Response(data=[
        {
            "id": n.id,
            "phone_number": n.phone_number,
            "status": n.status,
            "bot_active": n.bot_active,
        }
        for n in numbers
    ])
