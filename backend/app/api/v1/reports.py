from datetime import date, datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select, func, and_
from pydantic import BaseModel
from app.api.deps import DB, CurrentUser
from app.models.user import UserRole
from app.models.conversation import Conversation, Message, ConversationStatus
from app.schemas.common import Response

router = APIRouter(prefix="/reports", tags=["reports"])


class ConversationSummary(BaseModel):
    id: str
    user_phone: str
    status: str
    intent_summary: str | None
    message_count: int
    started_at: str
    last_message_at: str | None


class ReportsData(BaseModel):
    total_attended: int
    sale_closed: int
    sale_lost: int
    human_handoff: int
    active: int
    conversations: list[ConversationSummary]


@router.get("/{tenant_id}", response_model=Response)
async def get_reports(
    tenant_id: str,
    db: DB,
    current_user: CurrentUser,
    start_date: date | None = Query(None, description="Fecha inicio YYYY-MM-DD"),
    end_date: date | None = Query(None, description="Fecha fin YYYY-MM-DD"),
    status: str | None = Query(None, description="Filtrar por status"),
):
    if current_user.role != UserRole.admin and current_user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Sin acceso a este tenant")

    filters = [Conversation.tenant_id == tenant_id]

    if start_date:
        filters.append(Conversation.created_at >= datetime(start_date.year, start_date.month, start_date.day, tzinfo=timezone.utc))
    if end_date:
        end_dt = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, tzinfo=timezone.utc)
        filters.append(Conversation.created_at <= end_dt)
    if status and status in ("active", "sale_closed", "sale_lost", "human_handoff"):
        filters.append(Conversation.status == ConversationStatus(status))

    # Traer conversaciones con conteo de mensajes
    conversations_result = await db.execute(
        select(Conversation).where(and_(*filters)).order_by(Conversation.created_at.desc())
    )
    conversations = conversations_result.scalars().all()

    # Conteo de mensajes por conversación
    summaries = []
    for conv in conversations:
        count_result = await db.execute(
            select(func.count(Message.id)).where(Message.conversation_id == conv.id)
        )
        msg_count = count_result.scalar() or 0
        summaries.append(ConversationSummary(
            id=conv.id,
            user_phone=conv.user_phone,
            status=conv.status.value,
            intent_summary=conv.intent_summary,
            message_count=msg_count,
            started_at=conv.created_at.isoformat(),
            last_message_at=conv.last_message_at.isoformat() if conv.last_message_at else None,
        ))

    data = ReportsData(
        total_attended=len(conversations),
        sale_closed=sum(1 for c in conversations if c.status == ConversationStatus.sale_closed),
        sale_lost=sum(1 for c in conversations if c.status == ConversationStatus.sale_lost),
        human_handoff=sum(1 for c in conversations if c.status == ConversationStatus.human_handoff),
        active=sum(1 for c in conversations if c.status == ConversationStatus.active),
        conversations=summaries,
    )
    return Response(data=data.model_dump())
