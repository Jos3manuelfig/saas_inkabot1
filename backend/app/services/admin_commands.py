import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from redis.asyncio import Redis

from app.core.config import settings
from app.models.agent import VendedorAgent, TrainingBlock
from app.models.conversation import Conversation
from app.models.whatsapp import WhatsappNumber
from app.services.meta_whatsapp import MetaWhatsAppService

logger = logging.getLogger(__name__)

HELP_TEXT = (
    "🤖 *Comandos de administración INKABOT*\n\n"
    "/entrenar [texto] — Agrega un bloque de entrenamiento\n"
    "/ver — Muestra todos los bloques actuales\n"
    "/borrar [número] — Elimina el bloque con ese número\n"
    "/resetear — Elimina todos los bloques y conversaciones\n"
    "/ayuda — Muestra esta ayuda"
)


def is_admin_command(from_phone: str, text: str) -> bool:
    """Retorna True si el mensaje viene de José Manuel y empieza con /."""
    admin = settings.HANDOFF_PHONE.lstrip("+")
    return from_phone.lstrip("+") == admin and text.strip().startswith("/")


async def handle_admin_command(
    db: AsyncSession,
    text: str,
    wa_number: WhatsappNumber,
    meta: MetaWhatsAppService,
    from_phone: str,
) -> None:
    parts = text.strip().split(None, 1)
    cmd = parts[0].lower()
    arg = parts[1].strip() if len(parts) > 1 else ""
    tenant_id = wa_number.tenant_id

    if cmd == "/ayuda":
        reply = HELP_TEXT

    elif cmd == "/ver":
        reply = await _cmd_ver(db, tenant_id)

    elif cmd == "/entrenar":
        if not arg:
            reply = "❌ Uso: /entrenar [texto del bloque]"
        else:
            reply = await _cmd_entrenar(db, tenant_id, arg)

    elif cmd == "/borrar":
        if not arg.isdigit():
            reply = "❌ Uso: /borrar [número] — Ej: /borrar 2"
        else:
            reply = await _cmd_borrar(db, tenant_id, int(arg))

    elif cmd == "/resetear":
        reply = await _cmd_resetear(db, tenant_id, wa_number.phone_number_id)

    else:
        reply = f"❓ Comando desconocido: {cmd}\nEscribe /ayuda para ver los comandos disponibles."

    logger.info("[admin-cmd] %s from=%s tenant=%s", cmd, from_phone, tenant_id)
    await meta.send_text_message(to=from_phone, text=reply)


# ── Implementación de cada comando ───────────────────────────────────────────

async def _get_agent(db: AsyncSession, tenant_id: str) -> VendedorAgent | None:
    result = await db.execute(
        select(VendedorAgent)
        .where(VendedorAgent.tenant_id == tenant_id, VendedorAgent.is_active == True)
        .options(selectinload(VendedorAgent.training_blocks))
        .order_by(VendedorAgent.is_default.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _cmd_ver(db: AsyncSession, tenant_id: str) -> str:
    agent = await _get_agent(db, tenant_id)
    if not agent or not agent.training_blocks:
        return "📭 No hay bloques de entrenamiento aún."

    blocks = sorted(agent.training_blocks, key=lambda b: b.created_at)
    lines = [f"📚 *Bloques de entrenamiento ({len(blocks)}):*\n"]
    for i, block in enumerate(blocks, 1):
        preview = block.content[:120] + "…" if len(block.content) > 120 else block.content
        lines.append(f"*{i}.* {preview}")
    return "\n".join(lines)


async def _cmd_entrenar(db: AsyncSession, tenant_id: str, content: str) -> str:
    agent = await _get_agent(db, tenant_id)
    if not agent:
        return "❌ No se encontró un agente activo para este cliente."

    db.add(TrainingBlock(agent_id=agent.id, content=content))
    await db.commit()
    return "✅ Bloque agregado correctamente"


async def _cmd_borrar(db: AsyncSession, tenant_id: str, number: int) -> str:
    agent = await _get_agent(db, tenant_id)
    if not agent or not agent.training_blocks:
        return "❌ No hay bloques de entrenamiento para eliminar."

    blocks = sorted(agent.training_blocks, key=lambda b: b.created_at)
    if number < 1 or number > len(blocks):
        return f"❌ Número inválido. Hay {len(blocks)} bloque(s). Usa /ver para verlos."

    await db.delete(blocks[number - 1])
    await db.commit()
    return f"✅ Bloque #{number} eliminado"


async def _cmd_resetear(db: AsyncSession, tenant_id: str, phone_number_id: str) -> str:
    # Eliminar bloques y resetear nombre del agente
    agents_result = await db.execute(
        select(VendedorAgent)
        .where(VendedorAgent.tenant_id == tenant_id)
        .options(selectinload(VendedorAgent.training_blocks))
    )
    for agent in agents_result.scalars().all():
        for block in list(agent.training_blocks):
            await db.delete(block)
        agent.name = "Demo INKABOT"

    # Eliminar conversaciones (cascade borra mensajes)
    convs_result = await db.execute(
        select(Conversation).where(Conversation.tenant_id == tenant_id)
    )
    for conv in convs_result.scalars().all():
        await db.delete(conv)

    await db.commit()

    # Limpiar Redis
    redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        for pattern in [
            f"inkabot:buffer:{phone_number_id}:*",
            f"inkabot:rate:{phone_number_id}:*",
            f"inkabot:muted:{phone_number_id}:*",
        ]:
            keys = await redis_client.keys(pattern)
            if keys:
                await redis_client.delete(*keys)
    finally:
        await redis_client.aclose()

    return "✅ Cliente demo reseteado"
