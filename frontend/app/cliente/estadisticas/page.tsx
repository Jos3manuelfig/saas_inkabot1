'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { KPICard } from '@/components/ui/KPICard'
import { MessageSquare, TrendingUp, Users, CheckCircle, XCircle, PhoneCall, Loader2 } from 'lucide-react'
import { getSession } from '@/lib/auth'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8003'

interface DailyStat { date: string; sent: number; received: number }
interface HourStat  { hour: number; count: number }
interface Stats {
  messages_sent_week: number
  messages_received_week: number
  messages_last_7_days: DailyStat[]
  total_conversations_month: number
  sale_closed_month: number
  sale_lost_month: number
  human_handoff_month: number
  never_responded_month: number
  conversion_rate: number
  avg_messages_per_conv: number
  hour_distribution: HourStat[]
}

function fmtHour(h: number) {
  return `${String(h).padStart(2,'0')}:00`
}

// Rellena las 24 horas con 0 si no hay datos
function fillHours(dist: HourStat[]): HourStat[] {
  const map = new Map(dist.map(h => [h.hour, h.count]))
  return Array.from({ length: 24 }, (_, i) => ({ hour: i, count: map.get(i) ?? 0 }))
}

function peakHour(dist: HourStat[]) {
  if (!dist.length) return null
  return dist.reduce((a, b) => b.count > a.count ? b : a)
}

export default function ClienteEstadisticasPage() {
  const [stats, setStats]   = useState<Stats | null>(null)
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
      setError(e instanceof Error ? e.message : 'Error al cargar estadísticas')
    } finally { setLoading(false) }
  }, [tenantId, token])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#FF7A1A]" /></div>
  if (error || !stats) return <div className="flex items-center justify-center h-64 text-[#FF4D6A] text-sm">{error ?? 'Sin datos'}</div>

  const hoursFull = fillHours(stats.hour_distribution)
  const peak = peakHour(stats.hour_distribution)
  const total = stats.total_conversations_month

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-[#F2F2F2]">Mis Estadísticas</h1>
        <p className="text-sm text-[#8A8A8A] mt-0.5">Rendimiento de tu chatbot este mes</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Conversaciones (mes)"  value={total}                          icon={<Users       size={20} />} color="violet" trend="Total del mes" trendUp />
        <KPICard title="Ventas cerradas"        value={stats.sale_closed_month}        icon={<CheckCircle size={20} />} color="green"  trend={`${stats.conversion_rate}% conversión`} trendUp />
        <KPICard title="Ventas perdidas"        value={stats.sale_lost_month}          icon={<XCircle     size={20} />} color="red"    trend="Sin concretar" />
        <KPICard title="Derivados a humano"     value={stats.human_handoff_month}      icon={<PhoneCall   size={20} />} color="yellow" trend="A asesor" trendUp />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Mensajes enviados (sem.)"  value={stats.messages_sent_week}     icon={<MessageSquare size={20} />} color="violet" trend="Bot → Clientes" trendUp />
        <KPICard title="Mensajes recibidos (sem.)" value={stats.messages_received_week} icon={<TrendingUp    size={20} />} color="green"  trend="Clientes → Bot" trendUp />
        <KPICard title="Prom. msgs / conversación" value={stats.avg_messages_per_conv}  icon={<MessageSquare size={20} />} color="violet" trend="Promedio del mes" trendUp />
      </div>

      {/* Métricas de comportamiento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5 flex flex-col items-center justify-center gap-2">
          <p className="text-xs text-[#8A8A8A]">Tasa de conversión</p>
          <p className="text-4xl font-bold text-[#00E5A0]">{stats.conversion_rate}%</p>
          <p className="text-xs text-[#8A8A8A]">ventas cerradas / total</p>
        </div>
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5 flex flex-col items-center justify-center gap-2">
          <p className="text-xs text-[#8A8A8A]">Nunca respondieron</p>
          <p className="text-4xl font-bold text-[#FF4D6A]">{stats.never_responded_month}</p>
          <p className="text-xs text-[#8A8A8A]">clientes sin respuesta del bot</p>
        </div>
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5 flex flex-col items-center justify-center gap-2">
          <p className="text-xs text-[#8A8A8A]">Hora pico</p>
          <p className="text-4xl font-bold text-[#FF7A1A]">{peak ? fmtHour(peak.hour) : '—'}</p>
          <p className="text-xs text-[#8A8A8A]">{peak ? `${peak.count} mensajes` : 'Sin datos'}</p>
        </div>
      </div>

      {/* Gráfica mensajes 7 días */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-[#F2F2F2] mb-4">Mensajes por día (últimos 7 días)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={stats.messages_last_7_days} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="egV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF7A1A" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF7A1A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
            <XAxis dataKey="date" tick={{ fill: '#8A8A8A', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8A8A8A', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, color: '#F2F2F2', fontSize: 12 }} formatter={((v: unknown, name: unknown) => [v, name === 'sent' ? 'Bot' : 'Clientes']) as never} />
            <Area type="monotone" dataKey="sent"     stroke="#FF7A1A" strokeWidth={2} fill="url(#egV)" name="sent" />
            <Area type="monotone" dataKey="received" stroke="#00E5A0" strokeWidth={2} fill="none"       name="received" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2">
          <span className="flex items-center gap-1.5 text-xs text-[#8A8A8A]"><span className="w-2.5 h-0.5 bg-[#FF7A1A] rounded" />Bot</span>
          <span className="flex items-center gap-1.5 text-xs text-[#8A8A8A]"><span className="w-2.5 h-0.5 bg-[#00E5A0] rounded" />Clientes</span>
        </div>
      </div>

      {/* Hora pico — gráfica de barras */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-[#F2F2F2] mb-1">Distribución por hora del día</h3>
        <p className="text-xs text-[#8A8A8A] mb-4">Mensajes recibidos este mes por hora</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={hoursFull} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
            <XAxis dataKey="hour" tick={{ fill: '#8A8A8A', fontSize: 9 }}
              tickFormatter={h => h % 4 === 0 ? fmtHour(h) : ''} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8A8A8A', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 11 }}
              formatter={((v: unknown) => [v, 'Mensajes']) as never}
              labelFormatter={((h: unknown) => fmtHour(Number(h))) as never}
            />
            <Bar dataKey="count" radius={[3,3,0,0]}>
              {hoursFull.map((h, i) => (
                <Cell key={i} fill={peak && h.hour === peak.hour ? '#FF7A1A' : '#2A2A2A'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Funnel visual */}
      {total > 0 && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[#F2F2F2] mb-4">Funnel de ventas (mes actual)</h3>
          <div className="space-y-3">
            {[
              { label: 'Total atendidos',   value: total,                          color: '#FF7A1A' },
              { label: 'Ventas cerradas',   value: stats.sale_closed_month,        color: '#00E5A0' },
              { label: 'Ventas perdidas',   value: stats.sale_lost_month,          color: '#FF4D6A' },
              { label: 'Derivados',         value: stats.human_handoff_month,      color: '#F59E0B' },
            ].map(({ label, value, color }) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#F2F2F2]">{label}</span>
                  <span className="text-[#8A8A8A]">{value} ({total > 0 ? Math.round(value/total*100) : 0}%)</span>
                </div>
                <div className="h-2 rounded-full bg-[#2A2A2A] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${total > 0 ? (value/total)*100 : 0}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
