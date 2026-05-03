from pydantic import BaseModel


class DailyMessageStat(BaseModel):
    date: str
    sent: int
    received: int


class HourStat(BaseModel):
    hour: int
    count: int


class ConvSummary(BaseModel):
    id: str
    user_phone: str
    status: str
    intent_summary: str | None
    message_count: int
    last_message_at: str | None


class LeadFunnel(BaseModel):
    nuevo: int = 0
    contactado: int = 0
    calificado: int = 0
    propuesta: int = 0
    cerrado: int = 0


class TenantStats(BaseModel):
    tenant_id: str
    # mensajes
    messages_today: int
    messages_sent_week: int
    messages_received_week: int
    messages_last_7_days: list[DailyMessageStat]
    # conversaciones
    active_conversations_today: int
    total_conversations_month: int
    sale_closed_month: int
    sale_lost_month: int
    human_handoff_month: int
    never_responded_month: int
    conversion_rate: float          # porcentaje 0-100
    avg_messages_per_conv: float
    # bot & plan
    bot_active: bool
    plan_name: str | None
    end_date: str | None
    days_remaining: int
    # listas
    last_conversations: list[ConvSummary]
    hour_distribution: list[HourStat]
    # legacy
    active_leads: int
    closed_leads_this_month: int
    funnel: LeadFunnel


class GlobalStats(BaseModel):
    total_tenants: int
    active_tenants: int
    messages_today: int
    monthly_revenue: float
    messages_last_7_days: list[DailyMessageStat]
