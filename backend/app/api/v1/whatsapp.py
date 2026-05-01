import logging
import httpx
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from app.api.deps import DB, CurrentUser, AdminUser
from app.models.user import UserRole
from app.models.whatsapp import WhatsappNumber, WhatsappConnectionStatus
from app.schemas.common import Response
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

META_API_BASE = "https://graph.facebook.com/v19.0"


class WhatsappNumberCreate(BaseModel):
    phone_number: str
    phone_number_id: str
    access_token: str
    display_name: str | None = None


async def _verify_meta_credentials(phone_number_id: str, access_token: str) -> dict:
    """
    Verifica las credenciales contra la API de Meta.
    Retorna dict con keys: valid (bool), display_name (str|None), error (str|None).
    """
    url = f"{META_API_BASE}/{phone_number_id}"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                url,
                headers={"Authorization": f"Bearer {access_token}"},
                params={"fields": "display_phone_number,verified_name,quality_rating"},
            )
        if res.status_code == 200:
            data = res.json()
            return {
                "valid": True,
                "display_name": data.get("verified_name") or data.get("display_phone_number"),
                "error": None,
            }
        else:
            error_body = res.json()
            msg = error_body.get("error", {}).get("message", f"HTTP {res.status_code}")
            return {"valid": False, "display_name": None, "error": msg}
    except httpx.TimeoutException:
        return {"valid": False, "display_name": None, "error": "Tiempo de espera agotado al contactar Meta"}
    except Exception as e:
        logger.error("[whatsapp] Error verificando credenciales Meta: %s", e)
        return {"valid": False, "display_name": None, "error": "Error de conexión con Meta"}


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


@router.get("/{tenant_id}/number", response_model=Response)
async def get_number(tenant_id: str, db: DB, _: AdminUser):
    """Devuelve la configuración WABA actual del tenant (sin exponer el token completo)."""
    result = await db.execute(
        select(WhatsappNumber).where(WhatsappNumber.tenant_id == tenant_id).limit(1)
    )
    number = result.scalar_one_or_none()
    if not number:
        return Response(data=None, message="Sin número configurado")

    token = number.access_token or ""
    masked = token[:6] + "••••••••" + token[-4:] if len(token) > 10 else "••••••••••"
    return Response(data={
        "id": number.id,
        "phone_number": number.phone_number,
        "phone_number_id": number.phone_number_id,
        "display_name": number.display_name,
        "status": number.status,
        "bot_active": number.bot_active,
        "access_token_masked": masked,
    })


@router.post("/{tenant_id}/number", response_model=Response, status_code=status.HTTP_200_OK)
async def save_number(tenant_id: str, body: WhatsappNumberCreate, db: DB, _: AdminUser):
    """Guarda (crea o actualiza) el número WABA y verifica contra Meta."""

    # 1. Verificar credenciales con Meta
    verification = await _verify_meta_credentials(body.phone_number_id, body.access_token)
    new_status = (
        WhatsappConnectionStatus.connected
        if verification["valid"]
        else WhatsappConnectionStatus.disconnected
    )

    # 2. Buscar número existente para este tenant
    result = await db.execute(
        select(WhatsappNumber).where(WhatsappNumber.tenant_id == tenant_id).limit(1)
    )
    number = result.scalar_one_or_none()

    if number:
        # Actualizar
        number.phone_number = body.phone_number
        number.phone_number_id = body.phone_number_id
        number.access_token = body.access_token
        number.display_name = body.display_name or verification.get("display_name") or number.display_name
        number.status = new_status
        number.bot_active = verification["valid"]
    else:
        # Crear
        number = WhatsappNumber(
            tenant_id=tenant_id,
            phone_number=body.phone_number,
            phone_number_id=body.phone_number_id,
            access_token=body.access_token,
            display_name=body.display_name or verification.get("display_name"),
            status=new_status,
            bot_active=verification["valid"],
        )
        db.add(number)

    await db.commit()
    await db.refresh(number)

    logger.info("[whatsapp] tenant=%s status=%s verified=%s", tenant_id, new_status, verification["valid"])

    return Response(
        data={
            "id": number.id,
            "phone_number": number.phone_number,
            "phone_number_id": number.phone_number_id,
            "display_name": number.display_name,
            "status": number.status,
            "bot_active": number.bot_active,
            "verification": verification,
        },
        message="Número guardado y verificado" if verification["valid"] else "Número guardado pero las credenciales no son válidas",
    )
