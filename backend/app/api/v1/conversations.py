from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, ConfigDict
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select, func, desc, update
from sqlalchemy.orm import selectinload
from app.api.deps import DB, CurrentUser
from app.models.conversation import Conversation, Message, ConversationStatus, MessageRole
from app.models.user import UserRole
from app.schemas.common import Response

router = APIRouter(prefix="/conversations", tags=["conversations"])

ARCHIVE_AFTER_DAYS = 30


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    role: MessageRole
    content: str
    created_at: datetime


class ConversationOut(BaseModel):
    id: str
    user_phone: str
    status: ConversationStatus
    is_archived: bool
    last_message_at: datetime | None
    last_message: str | None
    message_count: int
    intent_summary: str | None


def _check_access(current_user, tenant_id: str):
    if current_user.role != UserRole.admin and current_user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Sin acceso a este tenant")


async def _auto_archive_stale(db: DB, tenant_id: str) -> int:
    """Archiva conversaciones sin actividad por más de 30 días."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=ARCHIVE_AFTER_DAYS)
    result = await db.execute(
        update(Conversation)
        .where(
            Conversation.tenant_id == tenant_id,
            Conversation.is_archived == False,
            Conversation.last_message_at < cutoff,
            Conversation.last_message_at != None,
        )
        .values(is_archived=True)
    )
    if result.rowcount:
        await db.commit()
    return result.rowcount


@router.get("/{tenant_id}", response_model=Response)
async def list_conversations(
    tenant_id: str,
    db: DB,
    current_user: CurrentUser,
    archived: bool = Query(False, description="True para ver conversaciones archivadas"),
):
    _check_access(current_user, tenant_id)

    # Auto-archivar conversaciones inactivas antes de responder
    archived_count = await _auto_archive_stale(db, tenant_id)
    if archived_count:
        import logging
        logging.getLogger(__name__).info("[conversations] Auto-archivadas %d conversaciones inactivas", archived_count)

    # Subquery: conteo de mensajes
    count_sub = (
        select(Message.conversation_id, func.count(Message.id).label("cnt"))
        .group_by(Message.conversation_id)
        .subquery()
    )

    # Subquery: contenido del último mensaje por max(created_at)
    max_ts_sub = (
        select(Message.conversation_id, func.max(Message.created_at).label("max_ts"))
        .group_by(Message.conversation_id)
        .subquery()
    )
    last_msg_sub = (
        select(Message.conversation_id, Message.content)
        .join(max_ts_sub, (Message.conversation_id == max_ts_sub.c.conversation_id)
              & (Message.created_at == max_ts_sub.c.max_ts))
        .subquery()
    )

    result = await db.execute(
        select(
            Conversation.id,
            Conversation.user_phone,
            Conversation.status,
            Conversation.is_archived,
            Conversation.last_message_at,
            Conversation.intent_summary,
            last_msg_sub.c.content,
            count_sub.c.cnt,
        )
        .where(
            Conversation.tenant_id == tenant_id,
            Conversation.is_archived == archived,
        )
        .outerjoin(last_msg_sub, Conversation.id == last_msg_sub.c.conversation_id)
        .outerjoin(count_sub, Conversation.id == count_sub.c.conversation_id)
        .order_by(desc(Conversation.last_message_at))
    )

    rows = result.all()
    data = [
        ConversationOut(
            id=r[0],
            user_phone=r[1],
            status=r[2],
            is_archived=r[3],
            last_message_at=r[4],
            intent_summary=r[5],
            last_message=r[6],
            message_count=r[7] or 0,
        ).model_dump()
        for r in rows
    ]
    return Response(data=data)


@router.get("/{tenant_id}/{conversation_id}/messages", response_model=Response)
async def get_messages(tenant_id: str, conversation_id: str, db: DB, current_user: CurrentUser):
    _check_access(current_user, tenant_id)

    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id, Conversation.tenant_id == tenant_id)
        .options(selectinload(Conversation.messages))
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")

    # Últimos 20 mensajes ordenados cronológicamente
    msgs_sorted = sorted(conv.messages, key=lambda m: m.created_at)[-20:]
    messages = [MessageOut.model_validate(m).model_dump() for m in msgs_sorted]

    return Response(data={
        "conversation": {
            "id": conv.id,
            "user_phone": conv.user_phone,
            "status": conv.status,
            "is_archived": conv.is_archived,
            "intent_summary": conv.intent_summary,
            "last_message_at": conv.last_message_at.isoformat() if conv.last_message_at else None,
        },
        "messages": messages,
    })


@router.patch("/{tenant_id}/{conversation_id}/archive", response_model=Response)
async def toggle_archive(
    tenant_id: str,
    conversation_id: str,
    db: DB,
    current_user: CurrentUser,
    archive: bool = Query(True),
):
    """Archivar o desarchivar una conversación manualmente."""
    _check_access(current_user, tenant_id)

    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.tenant_id == tenant_id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")

    conv.is_archived = archive
    await db.commit()
    action = "archivada" if archive else "restaurada"
    return Response(message=f"Conversación {action}")
