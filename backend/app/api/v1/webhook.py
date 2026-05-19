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
from app.services.intent_classifier import IntentClassifierService, detect_handoff_keywords
from app.services import message_buffer
from app.services.admin_commands import is_admin_command, handle_admin_command

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook", tags=["webhook"])

HANDOFF_MESSAGE = (
    "Entendido 😊 Te conecto con un asesor que puede ayudarte mejor.\n\n"
    f"📱 Escríbele directamente aquí: https://wa.me/{settings.HANDOFF_PHONE}\n\n"
    "¡Gracias por contactarnos!"
)

NON_TEXT_REPLY = (
    "Lo siento, por ahora solo puedo procesar mensajes de texto 😊 "
    "¿En qué te puedo ayudar?"
)

CONSECUTIVE_LIMIT_REPLY = (
    "Parece que estás teniendo problemas para comunicarte. "
    "¿Te gustaría hablar con un asesor? "
    "Escribe *humano* para conectarte con alguien del equipo."
)

SPAM_REPLY = (
    "Estás enviando muchos mensajes muy rápido. "
    "Por favor espera unos minutos antes de continuar 🙏"
)

# Tipos de mensaje que Meta envía pero que no podemos procesar
NON_TEXT_TYPES = {"audio", "image", "sticker", "location", "document", "video", "reaction"}

CLOSING_MESSAGES = {
    ConversationStatus.sale_closed: (
        "¡Gracias por elegirnos! 🎉 Estaremos en contacto contigo pronto "
        "para coordinar los detalles. ¡Que tengas un excelente día!"
    ),
    ConversationStatus.sale_lost: (
        "Entendido, no hay problema 😊 Si en algún momento necesitas nuestros "
        "servicios, aquí estaremos. ¡Hasta pronto!"
    ),
}


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
            # 1. Buscar número registrado
            result = await db.execute(
                select(WhatsappNumber).where(
                    WhatsappNumber.phone_number_id == incoming.phone_number_id
                )
            )
            wa_number = result.scalar_one_or_none()
            if not wa_number or not wa_number.access_token:
                logger.warning("phone_number_id no registrado: %s", incoming.phone_number_id)
                continue

            meta = MetaWhatsAppService(incoming.phone_number_id, wa_number.access_token)
            from_phone = incoming.from_phone
            phone_number_id = incoming.phone_number_id

            # 2. Marcar como leído inmediatamente (doble check azul)
            await meta.mark_as_read(incoming.message_id)

            # Feature 1: mensajes no textuales — responder y continuar
            if incoming.message_type in NON_TEXT_TYPES:
                await meta.send_text_message(to=from_phone, text=NON_TEXT_REPLY)
                continue

            # Comandos de admin (José Manuel vía WhatsApp)
            if is_admin_command(from_phone, incoming.text):
                await handle_admin_command(db, incoming.text, wa_number, meta, from_phone)
                continue

            # Feature 4: anti-spam via Redis
            spam_status = await message_buffer.check_spam(from_phone, phone_number_id)
            if spam_status == "muted":
                logger.info("[spam] número silenciado: %s", from_phone)
                continue
            if spam_status == "limit_reached":
                logger.warning("[spam] límite alcanzado: %s", from_phone)
                await meta.send_text_message(to=from_phone, text=SPAM_REPLY)
                continue

            # 3. Agregar al buffer Redis y (re)iniciar timer de 3 segundos
            await message_buffer.push_and_schedule(
                phone=from_phone,
                phone_number_id=phone_number_id,
                text=incoming.text,
                callback=lambda text, fp=from_phone, pnid=phone_number_id: (
                    _process_buffered(fp, pnid, text)
                ),
            )

    return {"status": "ok"}


async def _process_buffered(from_phone: str, phone_number_id: str, combined_text: str) -> None:
    """Procesa los mensajes agrupados del buffer con su propia sesión de BD."""
    async with AsyncSessionLocal() as db:
        try:
            await _handle_incoming_message(db, from_phone, phone_number_id, combined_text)
        except Exception as e:
            logger.error("Error en _process_buffered: %s", e, exc_info=True)
            await db.rollback()


async def _handle_incoming_message(
    db, from_phone: str, phone_number_id: str, text: str
) -> None:
    try:
        # 1. Buscar número registrado
        result = await db.execute(
            select(WhatsappNumber).where(WhatsappNumber.phone_number_id == phone_number_id)
        )
        wa_number = result.scalar_one_or_none()
        if not wa_number or not wa_number.access_token:
            return

        meta = MetaWhatsAppService(phone_number_id, wa_number.access_token)

        # 2. Buscar o crear conversación activa
        conv_result = await db.execute(
            select(Conversation).where(
                Conversation.whatsapp_number_id == wa_number.id,
                Conversation.user_phone == from_phone,
                Conversation.is_active == True,
            )
        )
        conversation = conv_result.scalar_one_or_none()

        if not conversation:
            # Verificar si ya tuvo una conversación cerrada o derivada
            prev_result = await db.execute(
                select(Conversation).where(
                    Conversation.tenant_id == wa_number.tenant_id,
                    Conversation.user_phone == from_phone,
                    Conversation.status.in_([
                        ConversationStatus.sale_closed,
                        ConversationStatus.human_handoff,
                    ]),
                ).limit(1)
            )
            previous = prev_result.scalar_one_or_none()

            conversation = Conversation(
                tenant_id=wa_number.tenant_id,
                whatsapp_number_id=wa_number.id,
                user_phone=from_phone,
                status=ConversationStatus.active,
            )
            db.add(conversation)
            await db.flush()

            if previous:
                reply_text = (
                    "¡Hola de nuevo! Ya tenemos tus datos registrados. "
                    "El equipo de INKABOT se pondrá en contacto contigo pronto. "
                    "¿Tienes alguna consulta adicional?"
                )
                db.add(Message(conversation_id=conversation.id, role=MessageRole.user, content=text))
                db.add(Message(conversation_id=conversation.id, role=MessageRole.assistant, content=reply_text))
                conversation.last_message_at = datetime.now(timezone.utc)
                await db.commit()
                await meta.send_text_message(to=from_phone, text=reply_text)
                return

        elif conversation.is_archived:
            conversation.is_archived = False

        # Si ya fue derivada a humano, no responder
        if conversation.status == ConversationStatus.human_handoff:
            return

        # 3. Historial de mensajes (últimos 20)
        history_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(Message.created_at.desc())
            .limit(20)
        )
        recent = list(reversed(history_result.scalars().all()))
        history = [{"role": m.role.value, "content": m.content} for m in recent]

        # Feature 2: mensajes consecutivos del usuario sin respuesta del bot
        consecutive_user = 0
        for msg in reversed(history):
            if msg["role"] == "user":
                consecutive_user += 1
            else:
                break

        if consecutive_user >= 5:
            db.add(Message(conversation_id=conversation.id, role=MessageRole.user, content=text))
            db.add(Message(conversation_id=conversation.id, role=MessageRole.assistant, content=CONSECUTIVE_LIMIT_REPLY))
            conversation.last_message_at = datetime.now(timezone.utc)
            await db.commit()
            await meta.send_text_message(to=from_phone, text=CONSECUTIVE_LIMIT_REPLY)
            return

        # 4. Cargar agente — primero el default, si no el primero activo
        agent_result = await db.execute(
            select(VendedorAgent)
            .where(
                VendedorAgent.tenant_id == wa_number.tenant_id,
                VendedorAgent.is_active == True,
            )
            .options(selectinload(VendedorAgent.training_blocks))
            .order_by(VendedorAgent.is_default.desc())
            .limit(1)
        )
        agent = agent_result.scalar_one_or_none()

        agent_prompt = agent.system_prompt if agent else None
        training_contents = [b.content for b in agent.training_blocks] if agent else []

        # 5. Guardar mensaje del usuario
        db.add(Message(
            conversation_id=conversation.id,
            role=MessageRole.user,
            content=text,
        ))

        # 6. Detectar si pide atención humana
        classifier = IntentClassifierService()
        closing_text: str | None = None

        if detect_handoff_keywords(text):
            reply_text = HANDOFF_MESSAGE
            conversation.status = ConversationStatus.human_handoff
            conversation.intent_summary = "Cliente solicitó atención humana"
            conversation.is_active = False
        else:
            # 7. Generar respuesta con Claude
            ai_service = AnthropicService()
            reply_text = await ai_service.generate_reply(
                user_message=text,
                history=history,
                agent_system_prompt=agent_prompt,
                training_blocks=training_contents,
            )

            # 8. Clasificar intención
            full_history = history + [
                {"role": "user", "content": text},
                {"role": "assistant", "content": reply_text},
            ]
            status, summary = await classifier.classify(full_history)
            if status != "active":
                conversation.status = ConversationStatus(status)
                conversation.intent_summary = summary
                if status in ("sale_closed", "sale_lost"):
                    conversation.is_active = False
                    # Feature 3: mensaje de cierre según resultado
                    closing_text = CLOSING_MESSAGES.get(conversation.status)

        # 9. Guardar respuesta del bot (y cierre si aplica)
        db.add(Message(
            conversation_id=conversation.id,
            role=MessageRole.assistant,
            content=reply_text,
        ))
        if closing_text:
            db.add(Message(
                conversation_id=conversation.id,
                role=MessageRole.assistant,
                content=closing_text,
            ))
        conversation.last_message_at = datetime.now(timezone.utc)
        await db.commit()

        # 10. Enviar por WhatsApp
        await meta.send_text_message(to=from_phone, text=reply_text)
        if closing_text:
            await meta.send_text_message(to=from_phone, text=closing_text)

    except Exception as e:
        logger.error("Error procesando mensaje: %s", e, exc_info=True)
        await db.rollback()
