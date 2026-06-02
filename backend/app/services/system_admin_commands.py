"""
Comandos de administración del sistema INKABOT via WhatsApp.
Solo accesibles desde ADMIN_PHONE escribiendo al número INKABOT_PHONE_NUMBER_ID.
"""
import httpx
import json
import logging
import secrets
import string
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from redis.asyncio import Redis

from app.core.config import settings
from app.core.security import hash_password
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.agent import VendedorAgent, TrainingBlock
from app.models.plan import Plan
from app.models.conversation import Conversation
from app.models.whatsapp import WhatsappNumber, WhatsappConnectionStatus
from app.services.meta_whatsapp import MetaWhatsAppService

logger = logging.getLogger(__name__)

_ALPHABET = string.ascii_letters + string.digits + "!@#$%"
_ADMIN_FLOW_TTL = 1800  # 30 minutos
_META_API = "https://graph.facebook.com/v19.0"

_redis: Redis | None = None


def _get_redis() -> Redis:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


HELP_TEXT = (
    "🤖 *Panel de administración INKABOT*\n\n"
    "*/nuevo* — Agregar cliente nuevo\n"
    "*/clientes* — Listar todos los clientes\n"
    "*/ver* [nombre o email] — Ver detalles de un cliente\n"
    "*/activar* [nombre o email] — Activar cliente\n"
    "*/desactivar* [nombre o email] — Desactivar cliente\n"
    "*/entrenar* [teléfono] — Entrenar agente de un cliente\n"
    "*/admin* o */ayuda* — Mostrar esta ayuda\n\n"
    "_Escribe /cancelar para salir de cualquier flujo._"
)

# Pasos del flujo /nuevo: (campo, pregunta)
_NUEVO_STEPS = [
    ("name",            "1️⃣ ¿Nombre del negocio?"),
    ("email",           "2️⃣ ¿Email del cliente?"),
    ("plan",            "3️⃣ ¿Plan? Responde *emprendedor* o *profesional*"),
    ("expiry",          "4️⃣ ¿Fecha de vencimiento? (DD/MM/AAAA)"),
    ("phone_number_id", "5️⃣ ¿Phone Number ID de Meta?"),
    ("access_token",    "6️⃣ ¿Access Token de Meta?"),
    ("phone_number",    "7️⃣ ¿Número de teléfono del cliente? (ej: +51987654321)"),
]


# ── Detección ────────────────────────────────────────────────────────────────

def is_system_admin_message(from_phone: str, phone_number_id: str) -> bool:
    """True SOLO si:
    1. INKABOT_PHONE_NUMBER_ID está configurado (no vacío)
    2. El mensaje fue recibido por el número INKABOT principal
    3. El remitente es exactamente el número admin
    Si alguna condición falla, retorna False y el mensaje sigue el flujo normal.
    """
    if not settings.INKABOT_PHONE_NUMBER_ID or not settings.ADMIN_PHONE:
        return False

    sender = from_phone.strip().lstrip("+")
    admin = settings.ADMIN_PHONE.strip().lstrip("+")
    receiver = phone_number_id.strip()
    inkabot_pnid = settings.INKABOT_PHONE_NUMBER_ID.strip()

    matched = (sender == admin) and (receiver == inkabot_pnid)
    logger.debug(
        "[sys-admin] check: sender=%s admin=%s receiver=%s inkabot_pnid=%s → %s",
        sender, admin, receiver, inkabot_pnid, matched,
    )
    return matched


# ── Dispatcher principal ─────────────────────────────────────────────────────

async def handle_system_admin(
    db: AsyncSession,
    text: str,
    meta: MetaWhatsAppService,
    from_phone: str,
) -> bool:
    """Retorna True si el mensaje fue manejado como comando admin.
    Retorna False si el mensaje debe seguir al flujo normal del chatbot (Claude)."""
    text = text.strip()
    if not text:
        return True  # mensaje sin texto — ignorar silenciosamente

    redis = _get_redis()
    lower = text.lower()

    # Verificar si hay un flujo activo antes de decidir
    state = await _get_flow(redis, from_phone)

    # Si no hay flujo activo y el mensaje no empieza con /, pasar a Claude
    if not state and not text.startswith("/"):
        return False

    # /cancelar — termina cualquier flujo
    if lower == "/cancelar":
        await redis.delete(_flow_key(from_phone))
        await meta.send_text_message(to=from_phone, text="❌ Flujo cancelado.")
        return True

    # /listo — termina flujo de entrenamiento
    if lower == "/listo":
        if state and state.get("flow") == "entrenar":
            await redis.delete(_flow_key(from_phone))
            count = state.get("count", 0)
            name = state.get("tenant_name", "el cliente")
            await meta.send_text_message(
                to=from_phone,
                text=f"✅ *Entrenamiento completado* para {name}\n{count} bloque(s) guardado(s)."
            )
        else:
            await meta.send_text_message(to=from_phone, text="ℹ️ No hay un flujo de entrenamiento activo.")
        return True

    # Continuar flujo activo si existe (state ya fue cargado arriba)
    if state:
        if state["flow"] == "nuevo":
            await _continue_nuevo(db, redis, from_phone, text, state, meta)
        elif state["flow"] == "entrenar":
            await _continue_entrenar(db, redis, from_phone, text, state, meta)
        return True

    # Parsear nuevo comando
    parts = text.split(None, 1)
    cmd = parts[0].lower()
    arg = parts[1].strip() if len(parts) > 1 else ""

    logger.info("[sys-admin] cmd=%s from=%s", cmd, from_phone)

    if cmd in ("/admin", "/ayuda"):
        await meta.send_text_message(to=from_phone, text=HELP_TEXT)

    elif cmd == "/nuevo":
        await _start_nuevo(redis, from_phone, meta)

    elif cmd == "/clientes":
        await meta.send_text_message(to=from_phone, text=await _cmd_clientes(db))

    elif cmd == "/ver":
        await meta.send_text_message(to=from_phone, text=await _cmd_ver(db, arg))

    elif cmd == "/activar":
        await meta.send_text_message(to=from_phone, text=await _cmd_toggle(db, arg, activate=True))

    elif cmd == "/desactivar":
        await meta.send_text_message(to=from_phone, text=await _cmd_toggle(db, arg, activate=False))

    elif cmd == "/entrenar":
        await _start_entrenar(db, redis, from_phone, arg, meta)

    else:
        await meta.send_text_message(
            to=from_phone,
            text=f"❓ Comando desconocido: *{cmd}*\nEscribe /ayuda para ver los comandos disponibles."
        )

    return True


# ── Redis helpers ─────────────────────────────────────────────────────────────

def _flow_key(phone: str) -> str:
    return f"inkabot:admin_flow:{phone}"


async def _get_flow(redis: Redis, phone: str) -> dict | None:
    raw = await redis.get(_flow_key(phone))
    return json.loads(raw) if raw else None


async def _set_flow(redis: Redis, phone: str, state: dict) -> None:
    await redis.setex(_flow_key(phone), _ADMIN_FLOW_TTL, json.dumps(state))


# ── Flujo /nuevo ──────────────────────────────────────────────────────────────

async def _start_nuevo(redis: Redis, from_phone: str, meta: MetaWhatsAppService) -> None:
    await _set_flow(redis, from_phone, {"flow": "nuevo", "step": 0, "data": {}})
    _, q = _NUEVO_STEPS[0]
    await meta.send_text_message(
        to=from_phone,
        text=f"🆕 *Nuevo cliente — paso 1 de {len(_NUEVO_STEPS)}*\n\n{q}\n\n_/cancelar para salir_"
    )


async def _continue_nuevo(
    db: AsyncSession, redis: Redis,
    from_phone: str, text: str, state: dict,
    meta: MetaWhatsAppService,
) -> None:
    step = state["step"]
    field, _ = _NUEVO_STEPS[step]

    # Validaciones por campo
    if field == "plan":
        normalized = text.lower()
        if normalized not in ("emprendedor", "profesional"):
            await meta.send_text_message(to=from_phone, text="❌ Responde *emprendedor* o *profesional*")
            return
        text = normalized

    elif field == "expiry":
        try:
            d, m, y = text.strip().split("/")
            parsed = date(int(y), int(m), int(d))
            text = parsed.isoformat()
        except Exception:
            await meta.send_text_message(
                to=from_phone, text="❌ Formato inválido. Usa DD/MM/AAAA (ej: 31/12/2026)"
            )
            return

    state["data"][field] = text
    state["step"] += 1

    if state["step"] < len(_NUEVO_STEPS):
        await _set_flow(redis, from_phone, state)
        _, next_q = _NUEVO_STEPS[state["step"]]
        await meta.send_text_message(
            to=from_phone,
            text=f"*Paso {state['step'] + 1} de {len(_NUEVO_STEPS)}*\n\n{next_q}"
        )
    else:
        await redis.delete(_flow_key(from_phone))
        await _create_tenant_from_flow(db, state["data"], from_phone, meta)


async def _create_tenant_from_flow(
    db: AsyncSession, data: dict, from_phone: str, meta: MetaWhatsAppService
) -> None:
    try:
        # Email único
        if (await db.execute(select(User).where(User.email == data["email"]))).scalar_one_or_none():
            await meta.send_text_message(to=from_phone, text=f"❌ El email *{data['email']}* ya está registrado.")
            return

        # Plan
        plan_obj = (await db.execute(select(Plan).where(Plan.name == data["plan"]))).scalar_one_or_none()
        if not plan_obj:
            await meta.send_text_message(to=from_phone, text=f"❌ Plan '{data['plan']}' no encontrado en BD.")
            return

        password = "".join(secrets.choice(_ALPHABET) for _ in range(10))

        tenant = Tenant(name=data["name"], email=data["email"], phone=data["phone_number"], is_active=True)
        db.add(tenant)
        await db.flush()

        db.add(User(
            email=data["email"],
            hashed_password=hash_password(password),
            full_name=data["name"],
            role=UserRole.client,
            is_active=True,
            tenant_id=tenant.id,
        ))

        expiry = date.fromisoformat(data["expiry"])
        db.add(Subscription(
            tenant_id=tenant.id,
            plan_id=plan_obj.id,
            start_date=date.today(),
            end_date=expiry,
            status=SubscriptionStatus.active,
        ))

        db.add(VendedorAgent(
            tenant_id=tenant.id,
            name="Vendedor Principal",
            is_default=True,
            is_active=True,
        ))

        # Verificar con Meta
        meta_result = await _verify_meta(data["phone_number_id"], data["access_token"])
        db.add(WhatsappNumber(
            tenant_id=tenant.id,
            phone_number=data["phone_number"],
            phone_number_id=data["phone_number_id"],
            access_token=data["access_token"],
            status=WhatsappConnectionStatus.connected if meta_result["valid"] else WhatsappConnectionStatus.disconnected,
            bot_active=meta_result["valid"],
        ))

        await db.commit()

        meta_icon = "✅" if meta_result["valid"] else "⚠️"
        meta_msg = "conectado" if meta_result["valid"] else f"error — {meta_result.get('error', '?')}"

        await meta.send_text_message(
            to=from_phone,
            text=(
                f"✅ *Cliente creado exitosamente*\n\n"
                f"*Negocio:* {data['name']}\n"
                f"*Email:* {data['email']}\n"
                f"*Contraseña:* {password}\n"
                f"*Plan:* {data['plan'].capitalize()}\n"
                f"*Vence:* {expiry.strftime('%d/%m/%Y')}\n"
                f"*WhatsApp:* {data['phone_number']}\n"
                f"{meta_icon} *Meta:* {meta_msg}"
            )
        )

    except Exception as e:
        logger.error("Error creando tenant desde flujo admin: %s", e, exc_info=True)
        await db.rollback()
        await meta.send_text_message(to=from_phone, text=f"❌ Error al crear el cliente: {e}")


# ── Flujo /entrenar ───────────────────────────────────────────────────────────

async def _start_entrenar(
    db: AsyncSession, redis: Redis,
    from_phone: str, phone_arg: str,
    meta: MetaWhatsAppService,
) -> None:
    if not phone_arg:
        await meta.send_text_message(to=from_phone, text="❌ Uso: /entrenar [teléfono]\nEj: /entrenar +51987654321")
        return

    # Buscar por número de WhatsApp (parcial, sin +)
    wa_number = (await db.execute(
        select(WhatsappNumber)
        .where(WhatsappNumber.phone_number.ilike(f"%{phone_arg.lstrip('+').strip()}%"))
        .limit(1)
    )).scalar_one_or_none()

    if not wa_number:
        await meta.send_text_message(to=from_phone, text=f"❌ No se encontró cliente con el número *{phone_arg}*")
        return

    agent = (await db.execute(
        select(VendedorAgent)
        .where(VendedorAgent.tenant_id == wa_number.tenant_id, VendedorAgent.is_active == True)
        .order_by(VendedorAgent.is_default.desc())
        .limit(1)
    )).scalar_one_or_none()

    if not agent:
        await meta.send_text_message(to=from_phone, text="❌ No hay agente activo para ese cliente.")
        return

    # Obtener nombre del tenant
    tenant = (await db.execute(select(Tenant).where(Tenant.id == wa_number.tenant_id))).scalar_one_or_none()
    tenant_name = tenant.name if tenant else "?"

    await _set_flow(redis, from_phone, {
        "flow": "entrenar",
        "agent_id": agent.id,
        "tenant_name": tenant_name,
        "count": 0,
    })
    await meta.send_text_message(
        to=from_phone,
        text=(
            f"📚 *Modo entrenamiento: {tenant_name}*\n\n"
            f"Envía bloques de texto uno por uno.\n"
            f"Escribe */listo* al terminar o */cancelar* para salir."
        )
    )


async def _continue_entrenar(
    db: AsyncSession, redis: Redis,
    from_phone: str, text: str, state: dict,
    meta: MetaWhatsAppService,
) -> None:
    if text.startswith("/"):
        await meta.send_text_message(
            to=from_phone,
            text="⚠️ Estás en modo entrenamiento.\nEscribe */listo* para terminar o */cancelar* para salir."
        )
        return

    db.add(TrainingBlock(agent_id=state["agent_id"], content=text))
    await db.commit()

    state["count"] += 1
    await _set_flow(redis, from_phone, state)
    await meta.send_text_message(
        to=from_phone,
        text=f"✅ Bloque #{state['count']} guardado. Envía otro o escribe */listo* para terminar."
    )


# ── Comandos directos ─────────────────────────────────────────────────────────

async def _cmd_clientes(db: AsyncSession) -> str:
    tenants = (await db.execute(
        select(Tenant)
        .options(
            selectinload(Tenant.subscription).selectinload(Subscription.plan),
            selectinload(Tenant.whatsapp_numbers),
        )
        .order_by(Tenant.name)
    )).scalars().all()

    if not tenants:
        return "📭 No hay clientes registrados."

    lines = [f"📋 *Clientes INKABOT ({len(tenants)}):*\n"]
    for t in tenants:
        icon = "🟢" if t.is_active else "🔴"
        plan = t.subscription.plan_name if t.subscription else "sin plan"
        phone = t.whatsapp_numbers[0].phone_number if t.whatsapp_numbers else "sin número"
        lines.append(f"{icon} *{t.name}* — {plan} — {phone}")

    return "\n".join(lines)


async def _cmd_ver(db: AsyncSession, query: str) -> str:
    if not query:
        return "❌ Uso: /ver [nombre o email]"

    tenant = (await db.execute(
        select(Tenant)
        .where(or_(Tenant.name.ilike(f"%{query}%"), Tenant.email.ilike(f"%{query}%")))
        .options(
            selectinload(Tenant.subscription).selectinload(Subscription.plan),
            selectinload(Tenant.whatsapp_numbers),
        )
        .limit(1)
    )).scalar_one_or_none()

    if not tenant:
        return f"❌ No se encontró cliente con '{query}'"

    conv_count = await db.scalar(
        select(func.count()).select_from(Conversation).where(Conversation.tenant_id == tenant.id)
    )

    icon = "🟢 Activo" if tenant.is_active else "🔴 Inactivo"
    plan = tenant.subscription.plan_name if tenant.subscription else "—"
    expiry = (
        tenant.subscription.end_date.strftime("%d/%m/%Y")
        if tenant.subscription and tenant.subscription.end_date else "—"
    )
    phones = (
        "\n".join(f"  • {w.phone_number} ({w.status})" for w in tenant.whatsapp_numbers)
        if tenant.whatsapp_numbers else "  sin número"
    )

    return (
        f"👤 *{tenant.name}*\n"
        f"Email: {tenant.email}\n"
        f"Estado: {icon}\n"
        f"Plan: {plan} — vence {expiry}\n"
        f"WhatsApp:\n{phones}\n"
        f"Conversaciones: {conv_count or 0}"
    )


async def _cmd_toggle(db: AsyncSession, query: str, activate: bool) -> str:
    verb = "activar" if activate else "desactivar"
    if not query:
        return f"❌ Uso: /{verb} [nombre o email]"

    tenant = (await db.execute(
        select(Tenant)
        .where(or_(Tenant.name.ilike(f"%{query}%"), Tenant.email.ilike(f"%{query}%")))
        .limit(1)
    )).scalar_one_or_none()

    if not tenant:
        return f"❌ No se encontró cliente con '{query}'"

    tenant.is_active = activate
    await db.commit()

    icon = "✅" if activate else "🚫"
    done = "activado" if activate else "desactivado"
    return f"{icon} Cliente *{tenant.name}* {done} correctamente."


# ── Verificación Meta ─────────────────────────────────────────────────────────

async def _verify_meta(phone_number_id: str, access_token: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                f"{_META_API}/{phone_number_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"fields": "display_phone_number,verified_name"},
            )
        if res.status_code == 200:
            return {"valid": True, "error": None}
        msg = res.json().get("error", {}).get("message", f"HTTP {res.status_code}")
        return {"valid": False, "error": msg}
    except Exception as e:
        return {"valid": False, "error": str(e)}
