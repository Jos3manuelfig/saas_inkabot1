import logging
from fastapi import APIRouter, Request, Response, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.whatsapp import WhatsappNumber
from app.models.conversation import Conversation, Message, MessageRole
from app.models.agent import VendedorAgent
from app.services.meta_whatsapp import MetaWhatsAppService
from app.services.anthropic_service import AnthropicService

logger = logging.getLogger(__name__)

# Este router NO usa JWT — Meta llama directamente al webhook
router = APIRouter(prefix="/webhook", tags=["webhook"])


# ── Verificación del webhook (Meta llama esto al registrarlo) ──────────────

@router.get("/whatsapp")
async def verify_webhook(
    hub_mode: str = Query(alias="hub.mode", default=""),
    hub_verify_token: str = Query(alias="hub.verify_token", default=""),
    hub_challenge: str = Query(alias="hub.challenge", default=""),
):
    """Meta envía un GET para verificar que el webhook es legítimo.
    Debe responder con hub.challenge si el token coincide."""
    if hub_mode == "subscribe" and hub_verify_token == settings.WEBHOOK_VERIFY_TOKEN:
        logger.info("Webhook de Meta verificado correctamente.")
        return Response(content=hub_challenge, media_type="text/plain")

    logger.warning("Intento de verificación de webhook con token inválido.")
    raise HTTPException(status_code=403, detail="Token de verificación inválido")


# ── Recepción de mensajes entrantes ───────────────────────────────────────

@router.post("/whatsapp", status_code=200)
async def receive_message(request: Request):
    """Meta envía un POST por cada mensaje entrante.
    Siempre responder 200 rápido — procesar de forma async."""
    payload = await request.json()

    # Meta espera un 200 inmediato; el procesamiento ocurre después
    incoming_messages = MetaWhatsAppService.parse_webhook_payload(payload)

    if not incoming_messages:
        return {"status": "ok"}

    async with AsyncSessionLocal() as db:
        for incoming in incoming_messages:
            await _handle_incoming_message(db, incoming)

    return {"status": "ok"}


async def _handle_incoming_message(db, incoming) -> None:
    """Flujo completo: identificar tenant → cargar contexto → llamar IA → responder."""
    try:
        # 1. Buscar el número de negocio por phone_number_id
        result = await db.execute(
            select(WhatsappNumber)
            .where(WhatsappNumber.phone_number_id == incoming.phone_number_id)
        )
        wa_number = result.scalar_one_or_none()

        if not wa_number or not wa_number.access_token:
            logger.warning(f"phone_number_id no registrado: {incoming.phone_number_id}")
            return

        meta = MetaWhatsAppService(
            phone_number_id=incoming.phone_number_id,
            access_token=wa_number.access_token,
        )

        # Marcar como leído (checks azules)
        await meta.mark_as_read(incoming.message_id)

        # 2. Buscar o crear conversación para este usuario final
        conv_result = await db.execute(
            select(Conversation).where(
                Conversation.whatsapp_number_id == wa_number.id,
                Conversation.user_phone == incoming.from_phone,
                Conversation.is_active == True,
            )
        )
        conversation = conv_result.scalar_one_or_none()

        if not conversation:
            conversation = Conversation(
                tenant_id=wa_number.tenant_id,
                whatsapp_number_id=wa_number.id,
                user_phone=incoming.from_phone,
            )
            db.add(conversation)
            await db.flush()

        # 3. Cargar últimos 20 mensajes del historial
        history_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(Message.created_at.desc())
            .limit(20)
        )
        recent_messages = list(reversed(history_result.scalars().all()))
        history = [{"role": m.role.value, "content": m.content} for m in recent_messages]

        # 4. Cargar el agente activo del tenant y su system prompt
        agent_result = await db.execute(
            select(VendedorAgent)
            .where(
                VendedorAgent.tenant_id == wa_number.tenant_id,
                VendedorAgent.is_active == True,
            )
            .options(selectinload(VendedorAgent.training_blocks))
            .limit(1)
        )
        agent = agent_result.scalar_one_or_none()

        agent_prompt = agent.system_prompt if agent else None
        training_contents = [b.content for b in agent.training_blocks] if agent else []

        # 5. Llamar a Claude
        ai_service = AnthropicService()
        reply_text = await ai_service.generate_reply(
            user_message=incoming.text,
            history=history,
            agent_system_prompt=agent_prompt,
            training_blocks=training_contents,
        )

        # 6. Guardar mensaje del usuario y respuesta del bot en DB
        db.add(Message(
            conversation_id=conversation.id,
            role=MessageRole.user,
            content=incoming.text,
        ))
        db.add(Message(
            conversation_id=conversation.id,
            role=MessageRole.assistant,
            content=reply_text,
        ))
        await db.commit()

        # 7. Enviar respuesta por WhatsApp
        await meta.send_text_message(to=incoming.from_phone, text=reply_text)

    except Exception as e:
        logger.error(f"Error procesando mensaje entrante: {e}", exc_info=True)
        await db.rollback()
