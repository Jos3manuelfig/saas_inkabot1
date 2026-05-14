import asyncio
import logging
from collections.abc import Callable, Coroutine
from typing import Any

from redis.asyncio import Redis

from app.core.config import settings

logger = logging.getLogger(__name__)

BUFFER_DELAY_SECONDS = 3

_redis: Redis | None = None
_pending_tasks: dict[str, asyncio.Task] = {}


def _get_redis() -> Redis:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


def _buf_key(phone_number_id: str, phone: str) -> str:
    return f"inkabot:buffer:{phone_number_id}:{phone}"


async def push_and_schedule(
    phone: str,
    phone_number_id: str,
    text: str,
    callback: Callable[[str], Coroutine[Any, Any, None]],
) -> None:
    """Push text to Redis buffer and (re)start the flush timer.

    Si llega otro mensaje del mismo número antes de BUFFER_DELAY_SECONDS,
    se cancela el timer anterior y se reinicia — el bot responde una sola vez
    con todos los mensajes concatenados.
    """
    key = _buf_key(phone_number_id, phone)
    task_key = f"{phone_number_id}:{phone}"

    r = _get_redis()
    await r.rpush(key, text)
    await r.expire(key, 300)  # TTL de seguridad: 5 minutos

    # Cancelar timer anterior y arrancar uno nuevo
    existing = _pending_tasks.get(task_key)
    if existing and not existing.done():
        existing.cancel()

    task = asyncio.create_task(_flush_after_delay(key, task_key, callback))
    _pending_tasks[task_key] = task
    logger.debug("[buffer] timer reiniciado key=%s delay=%ds", task_key, BUFFER_DELAY_SECONDS)


async def _flush_after_delay(
    key: str,
    task_key: str,
    callback: Callable[[str], Coroutine[Any, Any, None]],
) -> None:
    try:
        await asyncio.sleep(BUFFER_DELAY_SECONDS)

        r = _get_redis()
        messages: list[str] = await r.lrange(key, 0, -1)
        await r.delete(key)
        _pending_tasks.pop(task_key, None)

        if not messages:
            return

        combined = "\n".join(messages)
        logger.info("[buffer] flush %d msg(s) key=%s", len(messages), task_key)
        await callback(combined)

    except asyncio.CancelledError:
        pass  # llegó un mensaje nuevo — un task fresco tomará el relevo
    except Exception:
        logger.error("[buffer] error al procesar key=%s", task_key, exc_info=True)
        _pending_tasks.pop(task_key, None)
