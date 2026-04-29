import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Request, Response, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.whatsapp import WhatsappNumber
from app.models.conversation import Conversation, Message, MessageRole, ConversationStatus
from app.models.agent import VendedorAgent
from app.services.meta_whatsapp import MetaWhatsAppService
from app.services.anthropic_service import AnthropicService
from app.services.intent_classifier import IntentClassifierService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook", tags=["webhook"])

HANDOFF_MESSAGE = (
    "Entendido 😊 Te conecto con un asesor que puede ayudarte mejor.\n\n"
    f"📱 Escríbele directamente aquí: https://wa.me/{settings.HANDOFF_PHONE}\n\n"
    "¡Gracias por contactarnos!"
)


# ── Verificación del webhook ────────────────────────────────────────────────

@router.get("/whatsapp")
async def verify_webhook(
    hub_mode: str = Query(alias="hub.mode", default=""),
    hub_verify_token: str = Query(alias="hub.verify_token", default=""),
    hub_challenge: str = Query(alias="hub.challenge", default=""),
):
    if hub_mode == "subscribe" and hub_verify_token == settings.WEBHOOK_VERIFY_TOKEN:
        logger.info("Webhook de Meta verificado correctamente.")
        return Response(content=hub_challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Token de verificación inválido")


# ── Recepción de mensajes ───────────────────────────────────────────────────

@router.post("/whatsapp", status_code=200)
async def receive_message(request: Request):
    payload = await request.json()
    incoming_messages = MetaWhatsAppService.parse_webhook_payload(payload)

    if not incoming_messages:
        return {"status": "ok"}

    async with AsyncSessionLocal() as db:
        for incoming in incoming_messages:
            await _handle_incoming_message(db, incoming)

    return {"status": "ok"}


async def _handle_incoming_message(db, incoming) -> None:
    try:
        # 1. Buscar número registrado
        result = await db.execute(
            select(WhatsappNumber).where(WhatsappNumber.phone_number_id == incoming.phone_number_id)
        )
        wa_number = result.scalar_one_or_none()
        if not wa_number or not wa_number.access_token:
            logger.warning(f"phone_number_id no registrado: {incoming.phone_number_id}")
            return

        meta = MetaWhatsAppService(incoming.phone_number_id, wa_number.access_token)
        await meta.mark_as_read(incoming.message_id)

        # 2. Buscar o crear conversación
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
                status=ConversationStatus.active,
            )
            db.add(conversation)
            await db.flush()

        # Si ya fue derivada a humano, no responder más
        if conversation.status == ConversationStatus.human_handoff:
            return

        # 3. Historial de mensajes
        history_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(Message.created_at.desc())
            .limit(20)
        )
        recent = list(reversed(history_result.scalars().all()))
        history = [{"role": m.role.value, "content": m.content} for m in recent]

        # 4. Cargar agente — primero el default, si no el primero activo
        agent_result = await db.execute(
            select(VendedorAgent)
            .where(
                VendedorAgent.tenant_id == wa_number.tenant_id,
                VendedorAgent.is_active == True,
            )
            .options(selectinload(VendedorAgent.training_blocks))
            .order_by(VendedorAgent.is_default.desc())  # default primero
            .limit(1)
        )
        agent = agent_result.scalar_one_or_none()

        agent_prompt = agent.system_prompt if agent else None
        training_contents = [b.content for b in agent.training_blocks] if agent else []

        # 5. Guardar mensaje del usuario
        db.add(Message(
            conversation_id=conversation.id,
            role=MessageRole.user,
            content=incoming.text,
        ))

        # 6. Clasificar intención del mensaje actual (detección rápida por keywords)
        classifier = IntentClassifierService()
        from app.services.intent_classifier import detect_handoff_keywords

        if detect_handoff_keywords(incoming.text):
            # Derivar a humano inmediatamente
            reply_text = HANDOFF_MESSAGE
            conversation.status = ConversationStatus.human_handoff
            conversation.intent_summary = "Cliente solicitó atención humana"
            conversation.is_active = False
        else:
            # 7. Generar respuesta con Claude
            ai_service = AnthropicService()
            reply_text = await ai_service.generate_reply(
                user_message=incoming.text,
                history=history,
                agent_system_prompt=agent_prompt,
                training_blocks=training_contents,
            )

            # 8. Clasificar intención en background (sin bloquear)
            full_history = history + [
                {"role": "user", "content": incoming.text},
                {"role": "assistant", "content": reply_text},
            ]
            status, summary = await classifier.classify(full_history)
            if status != "active":
                conversation.status = ConversationStatus(status)
                conversation.intent_summary = summary
                if status in ("sale_closed", "sale_lost"):
                    conversation.is_active = False

        # 9. Guardar respuesta y actualizar timestamp
        db.add(Message(
            conversation_id=conversation.id,
            role=MessageRole.assistant,
            content=reply_text,
        ))
        conversation.last_message_at = datetime.now(timezone.utc)
        await db.commit()

        # 10. Enviar por WhatsApp
        await meta.send_text_message(to=incoming.from_phone, text=reply_text)

    except Exception as e:
        logger.error(f"Error procesando mensaje: {e}", exc_info=True)
        await db.rollback()
