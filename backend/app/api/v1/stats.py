from fastapi import APIRouter, HTTPException
from sqlalchemy import select, func
from datetime import date, datetime, timedelta, timezone
from app.api.deps import DB, AdminUser, CurrentUser
from app.models.tenant import Tenant
from app.models.payment import Payment
from app.models.conversation import Message, Conversation, ConversationStatus
from app.models.subscription import Subscription
from app.models.whatsapp import WhatsappNumber
from app.models.user import UserRole
from app.schemas.common import Response
from app.schemas.stats import (
    GlobalStats, TenantStats, DailyMessageStat, LeadFunnel,
    HourStat, ConvSummary,
)

router = APIRouter(prefix="/stats", tags=["stats"])


async def _messages_last_7_days(db, tenant_id: str | None = None) -> list[DailyMessageStat]:
    stats = []
    for i in range(6, -1, -1):
        day = date.today() - timedelta(days=i)
        try:
            label = day.strftime("%-d %b")
        except ValueError:
            label = day.strftime("%d %b")
        try:
            q = (
                select(func.count(Message.id))
                .join(Conversation, Message.conversation_id == Conversation.id)
                .where(func.date(Message.created_at) == day)
            )
            if tenant_id:
                q = q.where(Conversation.tenant_id == tenant_id)
            sent = (await db.execute(q.where(Message.role == "assistant"))).scalar() or 0
            recv  = (await db.execute(q.where(Message.role == "user"))).scalar() or 0
        except Exception:
            sent, recv = 0, 0
        stats.append(DailyMessageStat(date=label, sent=sent, received=recv))
    return stats


@router.get("/global", response_model=Response)
async def global_stats(db: DB, _: AdminUser):
    total  = (await db.execute(select(func.count(Tenant.id)))).scalar() or 0
    active = (await db.execute(select(func.count(Tenant.id)).where(Tenant.is_active == True))).scalar() or 0

    today = date.today()
    revenue = (await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .where(func.extract("month", Payment.payment_date) == today.month)
        .where(func.extract("year",  Payment.payment_date) == today.year)
        .where(Payment.status == "paid")
    )).scalar() or 0

    messages = await _messages_last_7_days(db)
    today_msgs = messages[-1] if messages else DailyMessageStat(date="hoy", sent=0, received=0)

    return Response(data=GlobalStats(
        total_tenants=total, active_tenants=active,
        messages_today=today_msgs.sent + today_msgs.received,
        monthly_revenue=float(revenue),
        messages_last_7_days=messages,
    ).model_dump())


@router.get("/{tenant_id}", response_model=Response)
async def tenant_stats(tenant_id: str, db: DB, current_user: CurrentUser):
    if current_user.role != UserRole.admin and current_user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Sin acceso a este tenant")

    now   = datetime.now(timezone.utc)
    today = date.today()
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

    # ── Mensajes 7 días ──────────────────────────────────────────────────────
    weekly = await _messages_last_7_days(db, tenant_id)
    today_stat = weekly[-1] if weekly else DailyMessageStat(date="hoy", sent=0, received=0)
    sent_week  = sum(d.sent     for d in weekly)
    recv_week  = sum(d.received for d in weekly)

    # ── Conversaciones del mes ───────────────────────────────────────────────
    convs_month_result = await db.execute(
        select(Conversation)
        .where(Conversation.tenant_id == tenant_id, Conversation.created_at >= month_start)
    )
    convs_month = convs_month_result.scalars().all()
    total_month      = len(convs_month)
    closed_month     = sum(1 for c in convs_month if c.status == ConversationStatus.sale_closed)
    lost_month       = sum(1 for c in convs_month if c.status == ConversationStatus.sale_lost)
    handoff_month    = sum(1 for c in convs_month if c.status == ConversationStatus.human_handoff)
    conversion_rate  = round(closed_month / total_month * 100, 1) if total_month else 0.0

    # ── Conversaciones activas hoy ───────────────────────────────────────────
    today_start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)
    active_today = (await db.execute(
        select(func.count(Conversation.id))
        .where(
            Conversation.tenant_id == tenant_id,
            Conversation.last_message_at >= today_start,
            Conversation.status == ConversationStatus.active,
        )
    )).scalar() or 0

    # ── Nunca respondieron (solo 1 mensaje del usuario, 0 del bot) ───────────
    never_responded = 0
    for c in convs_month:
        user_msgs = (await db.execute(
            select(func.count(Message.id))
            .where(Message.conversation_id == c.id, Message.role == "user")
        )).scalar() or 0
        bot_msgs = (await db.execute(
            select(func.count(Message.id))
            .where(Message.conversation_id == c.id, Message.role == "assistant")
        )).scalar() or 0
        if user_msgs >= 1 and bot_msgs == 0:
            never_responded += 1

    # ── Promedio mensajes por conversación ───────────────────────────────────
    total_msgs = 0
    for c in convs_month:
        cnt = (await db.execute(
            select(func.count(Message.id)).where(Message.conversation_id == c.id)
        )).scalar() or 0
        total_msgs += cnt
    avg_msgs = round(total_msgs / total_month, 1) if total_month else 0.0

    # ── Distribución por hora del día ────────────────────────────────────────
    hour_rows = await db.execute(
        select(
            func.extract("hour", Message.created_at).label("h"),
            func.count(Message.id).label("cnt"),
        )
        .join(Conversation, Message.conversation_id == Conversation.id)
        .where(Conversation.tenant_id == tenant_id, Message.created_at >= month_start)
        .group_by(func.extract("hour", Message.created_at))
        .order_by(func.extract("hour", Message.created_at))
    )
    hour_dist = [HourStat(hour=int(r[0]), count=r[1]) for r in hour_rows.all()]

    # ── Últimas 5 conversaciones ─────────────────────────────────────────────
    last5_result = await db.execute(
        select(Conversation)
        .where(Conversation.tenant_id == tenant_id)
        .order_by(Conversation.last_message_at.desc().nullslast())
        .limit(5)
    )
    last5 = last5_result.scalars().all()
    last_conversations = []
    for c in last5:
        cnt = (await db.execute(
            select(func.count(Message.id)).where(Message.conversation_id == c.id)
        )).scalar() or 0
        last_conversations.append(ConvSummary(
            id=c.id,
            user_phone=c.user_phone,
            status=c.status.value,
            intent_summary=c.intent_summary,
            message_count=cnt,
            last_message_at=c.last_message_at.isoformat() if c.last_message_at else None,
        ))

    # ── Bot activo ───────────────────────────────────────────────────────────
    wa_result = await db.execute(
        select(WhatsappNumber).where(WhatsappNumber.tenant_id == tenant_id).limit(1)
    )
    wa = wa_result.scalar_one_or_none()
    bot_active = wa.bot_active if wa else False

    # ── Suscripción ──────────────────────────────────────────────────────────
    sub_result = await db.execute(
        select(Subscription).where(Subscription.tenant_id == tenant_id).limit(1)
    )
    sub = sub_result.scalar_one_or_none()
    plan_result = None
    end_date_str = None
    days_remaining = 0
    if sub:
        from app.models.plan import Plan
        plan_row = await db.execute(select(Plan).where(Plan.id == sub.plan_id))
        plan_result = plan_row.scalar_one_or_none()
        end_date_str = sub.end_date.isoformat()
        days_remaining = max(0, (sub.end_date - today).days)

    return Response(data=TenantStats(
        tenant_id=tenant_id,
        messages_today=today_stat.sent + today_stat.received,
        messages_sent_week=sent_week,
        messages_received_week=recv_week,
        messages_last_7_days=weekly,
        active_conversations_today=active_today,
        total_conversations_month=total_month,
        sale_closed_month=closed_month,
        sale_lost_month=lost_month,
        human_handoff_month=handoff_month,
        never_responded_month=never_responded,
        conversion_rate=conversion_rate,
        avg_messages_per_conv=avg_msgs,
        bot_active=bot_active,
        plan_name=plan_result.name.value if plan_result else None,
        end_date=end_date_str,
        days_remaining=days_remaining,
        last_conversations=last_conversations,
        hour_distribution=hour_dist,
        active_leads=active_today,
        closed_leads_this_month=closed_month,
        funnel=LeadFunnel(cerrado=closed_month),
    ).model_dump())
