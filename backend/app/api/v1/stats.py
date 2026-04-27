from fastapi import APIRouter, HTTPException
from sqlalchemy import select, func
from datetime import date, timedelta
from app.api.deps import DB, AdminUser, CurrentUser
from app.models.tenant import Tenant
from app.models.payment import Payment
from app.models.conversation import Message, Conversation
from app.models.user import UserRole
from app.schemas.common import Response
from app.schemas.stats import GlobalStats, TenantStats, DailyMessageStat, LeadFunnel

router = APIRouter(prefix="/stats", tags=["stats"])


async def _messages_last_7_days(db, tenant_id: str | None = None) -> list[DailyMessageStat]:
    stats = []
    for i in range(6, -1, -1):
        day = date.today() - timedelta(days=i)
        label = day.strftime("%-d %b") if hasattr(date, "strftime") else str(day)
        try:
            q = (
                select(func.count(Message.id))
                .join(Conversation, Message.conversation_id == Conversation.id)
                .where(func.date(Message.created_at) == day)
            )
            if tenant_id:
                q = q.where(Conversation.tenant_id == tenant_id)

            sent_q = q.where(Message.role == "assistant")
            recv_q = q.where(Message.role == "user")
            sent = (await db.execute(sent_q)).scalar() or 0
            received = (await db.execute(recv_q)).scalar() or 0
        except Exception:
            sent, received = 0, 0
        stats.append(DailyMessageStat(date=label, sent=sent, received=received))
    return stats


@router.get("/global", response_model=Response)
async def global_stats(db: DB, _: AdminUser):
    total = (await db.execute(select(func.count(Tenant.id)))).scalar() or 0
    active = (await db.execute(select(func.count(Tenant.id)).where(Tenant.is_active == True))).scalar() or 0

    today = date.today()
    revenue = (await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .where(func.extract("month", Payment.payment_date) == today.month)
        .where(func.extract("year", Payment.payment_date) == today.year)
        .where(Payment.status == "paid")
    )).scalar() or 0

    messages = await _messages_last_7_days(db)
    today_msgs = messages[-1] if messages else DailyMessageStat(date="hoy", sent=0, received=0)

    return Response(data=GlobalStats(
        total_tenants=total,
        active_tenants=active,
        messages_today=today_msgs.sent + today_msgs.received,
        monthly_revenue=float(revenue),
        messages_last_7_days=messages,
    ).model_dump())


@router.get("/{tenant_id}", response_model=Response)
async def tenant_stats(tenant_id: str, db: DB, current_user: CurrentUser):
    if current_user.role != UserRole.admin and current_user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Sin acceso a este tenant")

    messages = await _messages_last_7_days(db, tenant_id)
    today_msgs = messages[-1] if messages else DailyMessageStat(date="hoy", sent=0, received=0)

    return Response(data=TenantStats(
        tenant_id=tenant_id,
        messages_today=today_msgs.sent + today_msgs.received,
        messages_last_7_days=messages,
        active_leads=0,
        closed_leads_this_month=0,
        funnel=LeadFunnel(),
    ).model_dump())
