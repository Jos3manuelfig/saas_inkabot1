from pydantic import BaseModel


class DailyMessageStat(BaseModel):
    date: str
    sent: int
    received: int


class LeadFunnel(BaseModel):
    nuevo: int = 0
    contactado: int = 0
    calificado: int = 0
    propuesta: int = 0
    cerrado: int = 0


class TenantStats(BaseModel):
    tenant_id: str
    messages_today: int
    messages_last_7_days: list[DailyMessageStat]
    active_leads: int
    closed_leads_this_month: int
    funnel: LeadFunnel


class GlobalStats(BaseModel):
    total_tenants: int
    active_tenants: int
    messages_today: int
    monthly_revenue: float
    messages_last_7_days: list[DailyMessageStat]
