"""
Monitor de consumo de tokens de Anthropic.
Acumula tokens por mes en Redis, calcula costos y proyecciones,
y envía alertas por WhatsApp cuando el presupuesto está bajo.
"""
import logging
from datetime import date, timedelta
from redis.asyncio import Redis

from app.core.config import settings
from app.services.meta_whatsapp import MetaWhatsAppService

logger = logging.getLogger(__name__)

# Precios claude-haiku-4-5-20251001 (USD por 1K tokens)
_INPUT_PRICE_PER_1K = 0.0008
_OUTPUT_PRICE_PER_1K = 0.004

_redis: Redis | None = None


def _get_redis() -> Redis:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


def _month_tag() -> str:
    return date.today().strftime("%Y-%m")


def _days_until_month_end() -> int:
    today = date.today()
    if today.month == 12:
        next_month = date(today.year + 1, 1, 1)
    else:
        next_month = date(today.year, today.month + 1, 1)
    return (next_month - today).days


# ── Tracking ──────────────────────────────────────────────────────────────────

async def track_tokens(input_tokens: int, output_tokens: int) -> None:
    """Acumula tokens del mes actual en Redis. Llamar tras cada respuesta de Claude."""
    r = _get_redis()
    tag = _month_tag()
    ttl = (_days_until_month_end() + 5) * 86400  # conservar unos días tras el fin de mes

    pipe = r.pipeline()
    pipe.incrby(f"inkabot:tok:in:{tag}", input_tokens)
    pipe.incrby(f"inkabot:tok:out:{tag}", output_tokens)
    pipe.expire(f"inkabot:tok:in:{tag}", ttl)
    pipe.expire(f"inkabot:tok:out:{tag}", ttl)
    await pipe.execute()


# ── Estadísticas ──────────────────────────────────────────────────────────────

async def get_monthly_stats() -> dict:
    """Calcula estadísticas de uso, costos y proyecciones para el mes actual."""
    r = _get_redis()
    tag = _month_tag()

    input_tokens = int(await r.get(f"inkabot:tok:in:{tag}") or 0)
    output_tokens = int(await r.get(f"inkabot:tok:out:{tag}") or 0)
    total_tokens = input_tokens + output_tokens

    cost_used = (input_tokens / 1000 * _INPUT_PRICE_PER_1K
                 + output_tokens / 1000 * _OUTPUT_PRICE_PER_1K)

    budget: float = settings.ANTHROPIC_MONTHLY_BUDGET
    budget_remaining = max(0.0, budget - cost_used)

    today = date.today()
    days_elapsed = max(today.day, 1)
    daily_avg = cost_used / days_elapsed

    if daily_avg > 0:
        days_remaining_budget = budget_remaining / daily_avg
        exhaustion_date: date | None = today + timedelta(days=days_remaining_budget)
    else:
        days_remaining_budget = float("inf")
        exhaustion_date = None

    # Estado según días de saldo restante
    if days_remaining_budget > 30:
        status, status_text = "🟢", "OK"
    elif days_remaining_budget > 7:
        status, status_text = "🟡", "Atención"
    else:
        status, status_text = "🔴", "Crítico"

    alert_sent_today = bool(await r.exists(f"inkabot:tok:alert:{today.isoformat()}"))

    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens,
        "cost_used": cost_used,
        "budget": budget,
        "budget_remaining": budget_remaining,
        "daily_avg": daily_avg,
        "days_remaining_budget": days_remaining_budget,
        "exhaustion_date": exhaustion_date,
        "status": status,
        "status_text": status_text,
        "alert_sent_today": alert_sent_today,
        "days_elapsed": days_elapsed,
    }


def format_tokens_message(s: dict) -> str:
    """Formatea el mensaje completo del comando /tokens."""
    days = s["days_remaining_budget"]
    days_str = f"{days:.0f}" if days != float("inf") else "∞"
    exhaustion_str = s["exhaustion_date"].strftime("%d/%m/%Y") if s["exhaustion_date"] else "Sin proyección"
    daily_str = f"${s['daily_avg']:.4f}" if s["daily_avg"] > 0 else "$0.0000"

    return (
        f"📊 *Uso de Anthropic este mes:*\n\n"
        f"🔢 *Tokens usados:*\n"
        f"  • Entrada: {s['input_tokens']:,} tokens\n"
        f"  • Salida:  {s['output_tokens']:,} tokens\n"
        f"  • Total:   {s['total_tokens']:,} tokens\n\n"
        f"💰 *Costos:*\n"
        f"  • Usado este mes: ${s['cost_used']:.4f} USD\n"
        f"  • Saldo estimado restante: ${s['budget_remaining']:.2f} USD (budget ${s['budget']:.0f}/mes)\n"
        f"  • Promedio diario: {daily_str} USD\n\n"
        f"📈 *Proyección:*\n"
        f"  • Días restantes con saldo actual: {days_str} días\n"
        f"  • Fecha estimada de agotamiento: {exhaustion_str}\n\n"
        f"⚠️ *Estado:* {s['status']} {s['status_text']}"
    )


# ── Alertas ───────────────────────────────────────────────────────────────────

async def check_and_alert(phone_number_id: str, access_token: str, admin_phone: str) -> None:
    """Envía alerta por WhatsApp si el presupuesto está bajo (máx 1 vez/día)."""
    try:
        stats = await get_monthly_stats()

        if stats["status"] == "🟢":
            return
        if stats["alert_sent_today"]:
            return

        days = stats["days_remaining_budget"]
        days_str = f"{days:.0f}" if days != float("inf") else "∞"
        exhaustion_str = (
            stats["exhaustion_date"].strftime("%d/%m/%Y")
            if stats["exhaustion_date"] else "N/A"
        )

        msg = (
            f"{stats['status']} *Alerta INKABOT — Tokens Anthropic*\n\n"
            f"Has usado *${stats['cost_used']:.4f} USD* este mes.\n"
            f"Saldo restante estimado: *${stats['budget_remaining']:.2f} USD*\n"
            f"Días restantes de saldo: *{days_str} días*\n"
            f"Agotamiento estimado: *{exhaustion_str}*\n\n"
            f"Recarga en console.anthropic.com"
        )

        meta = MetaWhatsAppService(phone_number_id, access_token)
        await meta.send_text_message(to=admin_phone, text=msg)

        r = _get_redis()
        await r.setex(f"inkabot:tok:alert:{date.today().isoformat()}", 25 * 3600, "1")
        logger.info("[token-monitor] alerta enviada status=%s cost=%.4f", stats["status"], stats["cost_used"])

    except Exception as e:
        logger.error("[token-monitor] error en check_and_alert: %s", e)
