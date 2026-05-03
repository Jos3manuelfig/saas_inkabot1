'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShoppingBag, XCircle, Users, PhoneCall, Calendar, Loader2, Thermometer } from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
import { getSession } from '@/lib/auth'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8003'

type ConvStatus = 'active' | 'sale_closed' | 'sale_lost' | 'human_handoff'

interface ConvRow {
  id: string; user_phone: string; status: ConvStatus
  intent_summary: string | null; message_count: number
  started_at: string; last_message_at: string | null
}
interface ReportsData {
  total_attended: number; sale_closed: number; sale_lost: number
  human_handoff: number; active: number; conversations: ConvRow[]
}

// ── Termómetro de intención ─────────────────────────────────────────────────
type IntentLevel = 'curiosidad' | 'interesado' | 'muy_interesado' | 'sale_closed' | 'sale_lost' | 'human_handoff'

const INTENT_CFG: Record<IntentLevel, { label: string; color: string; bg: string; border: string; heat: number }> = {
  curiosidad:    { label: 'Curiosidad',      color: 'text-[#6B7280]', bg: 'bg-[#6B7280]/10',  border: 'border-[#6B7280]/25',  heat: 1 },
  interesado:    { label: 'Interesado',      color: 'text-[#3B82F6]', bg: 'bg-[#3B82F6]/10',  border: 'border-[#3B82F6]/25',  heat: 2 },
  muy_interesado:{ label: 'Muy interesado',  color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/10',  border: 'border-[#F59E0B]/25',  heat: 3 },
  sale_closed:   { label: 'Venta cerrada',   color: 'text-[#00E5A0]', bg: 'bg-[#00E5A0]/10',  border: 'border-[#00E5A0]/25',  heat: 5 },
  sale_lost:     { label: 'Venta perdida',   color: 'text-[#FF4D6A]', bg: 'bg-[#FF4D6A]/10',  border: 'border-[#FF4D6A]/25',  heat: 0 },
  human_handoff: { label: 'Derivado a humano',color:'text-[#F59E0B]', bg: 'bg-[#F59E0B]/10',  border: 'border-[#F59E0B]/25',  heat: 4 },
}

function getIntentLevel(conv: ConvRow): IntentLevel {
  if (conv.status === 'sale_closed')   return 'sale_closed'
  if (conv.status === 'sale_lost')     return 'sale_lost'
  if (conv.status === 'human_handoff') return 'human_handoff'
  // Para conversaciones activas, inferir del intent_summary y message_count
  const summary = (conv.intent_summary ?? '').toLowerCase()
  if (summary.includes('precio') || summary.includes('costo') || summary.includes('valor') || summary.includes('cuánto'))
    return 'interesado'
  if (summary.includes('detalle') || summary.includes('más info') || summary.includes('confirma') || conv.message_count >= 6)
    return 'muy_interesado'
  return 'curiosidad'
}

function HeatBar({ level }: { level: IntentLevel }) {
  const heat = INTENT_CFG[level].heat
  const colors = ['bg-[#2A2F42]','bg-[#6B7280]','bg-[#3B82F6]','bg-[#F59E0B]','bg-[#F97316]','bg-[#00E5A0]']
  return (
    <div className="flex gap-0.5 items-end h-4">
      {[1,2,3,4,5].map(i => (
        <div key={i} className={`w-1.5 rounded-sm ${i <= heat ? colors[heat] : 'bg-[#2A2F42]'}`}
          style={{ height: `${i * 3 + 4}px` }} />
      ))}
    </div>
  )
}

function IntentBadge({ level }: { level: IntentLevel }) {
  const cfg = INTENT_CFG[level]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      <Thermometer size={10} />
      {cfg.label}
    </span>
  )
}

function fmtDt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const FILTER_OPTS: { value: string; label: string }[] = [
  { value: '',              label: 'Todos los estados' },
  { value: 'sale_closed',   label: 'Venta cerrada' },
  { value: 'sale_lost',     label: 'Venta perdida' },
  { value: 'human_handoff', label: 'Derivado a humano' },
  { value: 'active',        label: 'En curso' },
]

export default function ReportesPage() {
  const [data, setData]       = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate,   setEndDate]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const session  = getSession()
  const tenantId = session?.user.clientId ?? ''
  const token    = session?.token ?? ''

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate)    params.set('start_date', startDate)
      if (endDate)      params.set('end_date', endDate)
      if (filterStatus) params.set('status', filterStatus)
      const res = await fetch(`${BASE_URL}/api/v1/reports/${tenantId}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) { const j = await res.json(); setData(j.data) }
    } catch (e) { console.error('[reportes]', e) }
    finally { setLoading(false) }
  }, [tenantId, token, startDate, endDate, filterStatus])

  useEffect(() => { load() }, [load])

  const convs  = data?.conversations ?? []
  const closed  = data?.sale_closed   ?? 0
  const lost    = data?.sale_lost     ?? 0
  const handoff = data?.human_handoff ?? 0
  const total   = data?.total_attended ?? 0
  const convRate = total > 0 ? Math.round((closed / total) * 100) : 0

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EAF0]">Reportes</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Termómetro de intención de compra</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center bg-[#141720] border border-[#2A2F42] rounded-2xl px-4 py-3">
        <Calendar size={15} className="text-[#6B7280]" />
        <div className="flex items-center gap-2">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-[#0D0F14] border border-[#2A2F42] text-[#E8EAF0] focus:outline-none focus:border-[#7B61FF]" />
          <span className="text-[#6B7280] text-xs">→</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-[#0D0F14] border border-[#2A2F42] text-[#E8EAF0] focus:outline-none focus:border-[#7B61FF]" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl bg-[#0D0F14] border border-[#2A2F42] text-[#E8EAF0] focus:outline-none focus:border-[#7B61FF]">
          {FILTER_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {(startDate || endDate || filterStatus) && (
          <button onClick={() => { setStartDate(''); setEndDate(''); setFilterStatus('') }}
            className="text-xs text-[#6B7280] hover:text-[#E8EAF0] transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-[#1C2030]">
            Limpiar ✕
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Clientes atendidos" value={total}    icon={<Users      size={20} />} color="violet" trend="Total conversaciones" trendUp />
        <KPICard title="Ventas concretadas" value={closed}   icon={<ShoppingBag size={20} />} color="green"  trend={`${convRate}% tasa de cierre`} trendUp />
        <KPICard title="Ventas perdidas"    value={lost}     icon={<XCircle    size={20} />} color="red"    trend="Sin concretar" />
        <KPICard title="Derivados a humano" value={handoff}  icon={<PhoneCall  size={20} />} color="yellow" trend="A asesor personal" trendUp />
      </div>

      {/* Barra de distribución */}
      {total > 0 && (
        <div className="bg-[#141720] border border-[#2A2F42] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[#E8EAF0] mb-4">Distribución de conversaciones</h3>
          <div className="flex h-3 rounded-full overflow-hidden gap-px">
            {closed  > 0 && <div className="bg-[#00E5A0]" style={{ width: `${(closed/total)*100}%`  }} title="Venta cerrada" />}
            {handoff > 0 && <div className="bg-[#F59E0B]" style={{ width: `${(handoff/total)*100}%` }} title="Derivado" />}
            {lost    > 0 && <div className="bg-[#FF4D6A]" style={{ width: `${(lost/total)*100}%`    }} title="Venta perdida" />}
            {(data?.active ?? 0) > 0 && <div className="bg-[#7B61FF] flex-1" title="En curso" />}
          </div>
          <div className="flex gap-4 mt-3">
            {[['bg-[#00E5A0]','Venta cerrada'],['bg-[#F59E0B]','Derivados'],['bg-[#FF4D6A]','Venta perdida'],['bg-[#7B61FF]','En curso']].map(([c,l]) => (
              <span key={l} className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                <span className={`w-2 h-2 rounded-sm ${c}`} />{l}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabla termómetro */}
      <div className="bg-[#141720] border border-[#2A2F42] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2A2F42]">
          <h3 className="text-sm font-semibold text-[#E8EAF0]">Historial de conversaciones — Intención de compra</h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-[#7B61FF]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2F42] bg-[#0D0F14]">
                  {['Cliente', 'Intención', 'Calor', 'Resumen', 'Mensajes', 'Fecha'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2F42]">
                {convs.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-[#6B7280]">No hay conversaciones en este período</td></tr>
                ) : convs.map(c => {
                  const level = getIntentLevel(c)
                  return (
                    <tr key={c.id} className="hover:bg-[#1C2030] transition-colors">
                      <td className="px-5 py-3.5 font-mono text-sm text-[#E8EAF0]">{c.user_phone}</td>
                      <td className="px-5 py-3.5"><IntentBadge level={level} /></td>
                      <td className="px-5 py-3.5"><HeatBar level={level} /></td>
                      <td className="px-5 py-3.5 max-w-xs">
                        <span className="text-xs text-[#6B7280] line-clamp-2">{c.intent_summary ?? '—'}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="text-sm font-semibold text-[#E8EAF0]">{c.message_count}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-[#6B7280]">{fmtDt(c.last_message_at ?? c.started_at)}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 py-3 border-t border-[#2A2F42] bg-[#0D0F14]">
          <p className="text-xs text-[#6B7280]">{convs.length} conversaciones</p>
        </div>
      </div>
    </div>
  )
}
