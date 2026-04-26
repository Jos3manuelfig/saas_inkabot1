from datetime import date, timedelta
from sqlalchemy import text, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.tenant import Tenant
from app.models.payment import Payment
from app.schemas.stats import GlobalStats, TenantStats, DailyMessageStat, LeadFunnel


class N8nReader:
    """Lee datos de conversaciones y leads desde la base de datos de n8n.
    NUNCA modifica estas tablas — solo SELECT."""

    def __init__(self, db: AsyncSession, n8n_db: AsyncSession):
        self.db = db
        self.n8n_db = n8n_db

    async def _get_messages_last_7_days(self, tenant_id: str | None = None) -> list[DailyMessageStat]:
        """Obtiene el conteo de mensajes por día en los últimos 7 días."""
        stats = []
        for i in range(6, -1, -1):
            day = date.today() - timedelta(days=i)
            label = day.strftime("%-d %b") if hasattr(date, "strftime") else str(day)

            # Filtramos por tenant_id si se proporciona (campo en session_id o metadata)
            tenant_filter = f"AND session_id LIKE '%{tenant_id}%'" if tenant_id else ""

            sent_q = text(f"""
                SELECT COUNT(*) FROM chat_histories
                WHERE type = 'ai'
                AND DATE(created_at) = :day
                {tenant_filter}
            """)
            recv_q = text(f"""
                SELECT COUNT(*) FROM chat_histories
                WHERE type = 'human'
                AND DATE(created_at) = :day
                {tenant_filter}
            """)

            try:
                sent = (await self.n8n_db.execute(sent_q, {"day": day})).scalar() or 0
                received = (await self.n8n_db.execute(recv_q, {"day": day})).scalar() or 0
            except Exception:
                sent, received = 0, 0

            stats.append(DailyMessageStat(date=label, sent=sent, received=received))

        return stats

    async def _get_lead_funnel(self, tenant_id: str) -> LeadFunnel:
        """Lee el funnel de leads desde la tabla custom de n8n."""
        try:
            result = await self.n8n_db.execute(
                text("""
                    SELECT stage, COUNT(*) as count
                    FROM leads
                    WHERE tenant_id = :tid
                    GROUP BY stage
                """),
                {"tid": tenant_id},
            )
            rows = result.fetchall()
            funnel_data = {row[0]: row[1] for row in rows}
            return LeadFunnel(**{k: funnel_data.get(k, 0) for k in LeadFunnel.model_fields})
        except Exception:
            return LeadFunnel()

    async def get_tenant_stats(self, tenant_id: str) -> TenantStats:
        messages = await self._get_messages_last_7_days(tenant_id)
        funnel = await self._get_lead_funnel(tenant_id)
        today_msgs = messages[-1] if messages else DailyMessageStat(date="hoy", sent=0, received=0)

        return TenantStats(
            tenant_id=tenant_id,
            messages_today=today_msgs.sent + today_msgs.received,
            messages_last_7_days=messages,
            active_leads=funnel.nuevo + funnel.contactado + funnel.calificado + funnel.propuesta,
            closed_leads_this_month=funnel.cerrado,
            funnel=funnel,
        )

    async def get_global_stats(self) -> GlobalStats:
        # Conteos de tenants desde la DB principal
        total_result = await self.db.execute(select(func.count(Tenant.id)))
        total_tenants = total_result.scalar() or 0

        active_result = await self.db.execute(
            select(func.count(Tenant.id)).where(Tenant.is_active == True)
        )
        active_tenants = active_result.scalar() or 0

        # Ingresos del mes actual
        today = date.today()
        revenue_result = await self.db.execute(
            text("""
                SELECT COALESCE(SUM(amount), 0) FROM payments
                WHERE EXTRACT(MONTH FROM payment_date) = :month
                AND EXTRACT(YEAR FROM payment_date) = :year
                AND status = 'paid'
            """),
            {"month": today.month, "year": today.year},
        )
        monthly_revenue = float(revenue_result.scalar() or 0)

        messages = await self._get_messages_last_7_days()
        today_msgs = messages[-1] if messages else DailyMessageStat(date="hoy", sent=0, received=0)

        return GlobalStats(
            total_tenants=total_tenants,
            active_tenants=active_tenants,
            messages_today=today_msgs.sent + today_msgs.received,
            monthly_revenue=monthly_revenue,
            messages_last_7_days=messages,
        )
