'use client'

import { useEffect, useState, useCallback } from 'react'
import { MessageSquare, CheckCircle, Bot, AlertTriangle, Phone, Loader2 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { KPICard } from '@/components/ui/KPICard'
import { getSession } from '@/lib/auth'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8003'

type ConvStatus = 'active' | 'sale_closed' | 'sale_lost' | 'human_handoff'

interface DailyStat  { date: string; sent: number; received: number }
interface ConvSummary { id: string; user_phone: string; status: ConvStatus; intent_summary: string | null; message_count: number; last_message_at: string | null }

interface Stats {
  messages_today: number
  messages_sent_week: number
  messages_received_week: number
  messages_last_7_days: DailyStat[]
  active_conversations_today: number
  sale_closed_month: number
  bot_active: boolean
  plan_name: string | null
  end_date: string | null
  days_remaining: number
  last_conversations: ConvSummary[]
}

const STATUS_CFG: Record<ConvStatus, { label: string; dot: string; text: string }> = {
  active:        { label: 'En curso',         dot: 'bg-[#7B61FF]', text: 'text-[#7B61FF]' },
  sale_closed:   { label: 'Venta cerrada',    dot: 'bg-[#00E5A0]', text: 'text-[#00E5A0]' },
  sale_lost:     { label: 'Venta perdida',    dot: 'bg-[#FF4D6A]', text: 'text-[#FF4D6A]' },
  human_handoff: { label: 'Derivado a humano',dot: 'bg-[#F59E0B]', text: 'text-[#F59E0B]' },
}

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ClienteDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  const session  = getSession()
  const tenantId = session?.user.clientId ?? ''
  const token    = session?.token ?? ''

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true); setError(null)
    try {
      const res = await fetch(`${BASE_URL}/api/v1/stats/${tenantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setStats(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos')
    } finally { setLoading(false) }
  }, [tenantId, token])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-[#7B61FF]" />
    </div>
  )
  if (error || !stats) return (
    <div className="flex items-center justify-center h-64 text-[#FF4D6A] text-sm">{error ?? 'Sin datos'}</div>
  )

  const isExpiring = stats.days_remaining <= 10 && stats.days_remaining > 0
  const isExpired  = stats.days_remaining === 0 && !!stats.end_date

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EAF0]">Mi Dashboard</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">{session?.user.name}</p>
      </div>

      {(isExpiring || isExpired) && (
        <div className="flex items-center gap-3 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3">
          <AlertTriangle size={18} className="text-[#F59E0B] shrink-0" />
          <p className="text-sm text-[#F59E0B]">
            {isExpired
              ? `Tu plan venció el ${fmtDate(stats.end_date)}. Contacta a soporte para renovar.`
              : `Tu plan vence en ${stats.days_remaining} días (${fmtDate(stats.end_date)}). Contacta a soporte para renovar.`}
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="Conversaciones activas hoy"
          value={stats.active_conversations_today}
          icon={<MessageSquare size={20} />}
          trend={`${stats.messages_today} mensajes hoy`}
          trendUp color="violet"
        />
        <KPICard
          title="Mensajes esta semana"
          value={stats.messages_sent_week + stats.messages_received_week}
          icon={<MessageSquare size={20} />}
          trend={`${stats.messages_sent_week} enviados · ${stats.messages_received_week} recibidos`}
          trendUp color="green"
        />
        <KPICard
          title="Ventas cerradas (mes)"
          value={stats.sale_closed_month}
          icon={<CheckCircle size={20} />}
          trend="Este mes"
          trendUp color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfica */}
        <div className="lg:col-span-2 bg-[#141720] border border-[#2A2F42] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[#E8EAF0] mb-4">Mensajes por día (últimos 7 días)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats.messages_last_7_days} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cgV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7B61FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7B61FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2F42" />
              <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1C2030', border: '1px solid #2A2F42', borderRadius: 10, color: '#E8EAF0', fontSize: 12 }} />
              <Area type="monotone" dataKey="sent"     stroke="#7B61FF" strokeWidth={2} fill="url(#cgV)" name="Bot" />
              <Area type="monotone" dataKey="received" stroke="#00E5A0" strokeWidth={2} fill="none"       name="Clientes" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-[#6B7280]"><span className="w-2.5 h-0.5 bg-[#7B61FF] rounded" />Bot</span>
            <span className="flex items-center gap-1.5 text-xs text-[#6B7280]"><span className="w-2.5 h-0.5 bg-[#00E5A0] rounded" />Clientes</span>
          </div>
        </div>

        {/* Bot + Plan */}
        <div className="space-y-4">
          <div className="bg-[#141720] border border-[#2A2F42] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[#E8EAF0] mb-4">Estado del bot</h3>
            <div className="flex flex-col items-center py-3 gap-3">
              <div className={`relative flex h-16 w-16 items-center justify-center rounded-full ${stats.bot_active ? 'bg-[#00E5A0]/10' : 'bg-[#FF4D6A]/10'}`}>
                {stats.bot_active && <span className="absolute inset-0 rounded-full animate-ping bg-[#00E5A0]/15" />}
                <Bot size={28} className={stats.bot_active ? 'text-[#00E5A0]' : 'text-[#FF4D6A]'} />
              </div>
              <p className={`text-sm font-bold ${stats.bot_active ? 'text-[#00E5A0]' : 'text-[#FF4D6A]'}`}>
                {stats.bot_active ? 'Bot Activo' : 'Bot Inactivo'}
              </p>
            </div>
          </div>

          <div className="bg-[#141720] border border-[#2A2F42] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[#E8EAF0] mb-3">Mi plan</h3>
            <div className="space-y-3">
              {[
                { label: 'Plan',          val: stats.plan_name ?? '—' },
                { label: 'Vencimiento',   val: fmtDate(stats.end_date) },
                { label: 'Días restantes',val: `${stats.days_remaining}d` },
              ].map(({ label, val }) => (
                <div key={label} className="flex items-center justify-between border-b border-[#2A2F42] pb-2 last:border-0 last:pb-0">
                  <span className="text-xs text-[#6B7280]">{label}</span>
                  <span className={`text-xs font-semibold ${label === 'Días restantes' && isExpiring ? 'text-[#F59E0B]' : 'text-[#E8EAF0]'}`}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Últimas conversaciones */}
      <div className="bg-[#141720] border border-[#2A2F42] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2A2F42]">
          <h3 className="text-sm font-semibold text-[#E8EAF0]">Últimas conversaciones</h3>
        </div>
        {stats.last_conversations.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#6B7280]">Sin conversaciones aún</p>
        ) : (
          <div className="divide-y divide-[#2A2F42]">
            {stats.last_conversations.map(c => {
              const cfg = STATUS_CFG[c.status as ConvStatus] ?? STATUS_CFG.active
              return (
                <div key={c.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#1C2030] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D0F14] shrink-0">
                      <Phone size={13} className="text-[#6B7280]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#E8EAF0]">{c.user_phone}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-1">{c.intent_summary ?? 'Sin intención detectada'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${cfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                    </span>
                    <span className="text-xs text-[#6B7280]">{fmtTime(c.last_message_at)}</span>
                    <span className="text-xs text-[#6B7280]">{c.message_count} msg</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
