'use client'

import { useState } from 'react'
import { BarChart2, ShoppingBag, XCircle, Users, PhoneCall, Calendar } from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
import { StatusBadge } from '@/components/ui/StatusBadge'

type ConvStatus = 'active' | 'sale_closed' | 'sale_lost' | 'human_handoff'

interface ConvRow {
  id: string
  user_phone: string
  status: ConvStatus
  intent_summary: string | null
  message_count: number
  started_at: string
  last_message_at: string | null
}

// Mock data para visualización — se reemplaza con llamada real al backend
const MOCK_CONVS: ConvRow[] = [
  { id: '1', user_phone: '+51987111222', status: 'sale_closed',    intent_summary: 'Cliente confirmó pedido de arreglo de pantalón', message_count: 8,  started_at: '2026-04-26T09:00:00Z', last_message_at: '2026-04-26T09:22:00Z' },
  { id: '2', user_phone: '+51976222333', status: 'sale_lost',      intent_summary: 'Cliente dijo que lo piensa, no volvió',          message_count: 4,  started_at: '2026-04-26T10:15:00Z', last_message_at: '2026-04-26T10:20:00Z' },
  { id: '3', user_phone: '+51965333444', status: 'human_handoff',  intent_summary: 'Cliente solicitó hablar con la dueña',            message_count: 3,  started_at: '2026-04-26T11:30:00Z', last_message_at: '2026-04-26T11:33:00Z' },
  { id: '4', user_phone: '+51954444555', status: 'sale_closed',    intent_summary: 'Pedido de vestido a medida confirmado S/120',     message_count: 12, started_at: '2026-04-27T08:00:00Z', last_message_at: '2026-04-27T08:45:00Z' },
  { id: '5', user_phone: '+51943555666', status: 'active',         intent_summary: null,                                              message_count: 5,  started_at: '2026-04-27T09:10:00Z', last_message_at: '2026-04-27T09:20:00Z' },
  { id: '6', user_phone: '+51932666777', status: 'sale_lost',      intent_summary: 'Preguntó precio de bordado, no respondió más',    message_count: 2,  started_at: '2026-04-27T10:00:00Z', last_message_at: '2026-04-27T10:05:00Z' },
  { id: '7', user_phone: '+51921777888', status: 'sale_closed',    intent_summary: 'Pidió presupuesto uniforme escolar, confirmó',    message_count: 9,  started_at: '2026-04-27T11:00:00Z', last_message_at: '2026-04-27T11:35:00Z' },
]

const STATUS_LABELS: Record<ConvStatus, string> = {
  active:        'En curso',
  sale_closed:   'Venta cerrada',
  sale_lost:     'Venta perdida',
  human_handoff: 'Derivado a humano',
}

const STATUS_BADGE: Record<ConvStatus, 'active' | 'inactive' | 'expiring' | 'pending'> = {
  active:        'pending',
  sale_closed:   'active',
  sale_lost:     'inactive',
  human_handoff: 'expiring',
}

function formatDt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function ReportesPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filterStatus, setFilterStatus] = useState<ConvStatus | ''>('')

  const filtered = MOCK_CONVS.filter(c => {
    const dt = new Date(c.started_at)
    if (startDate && dt < new Date(startDate)) return false
    if (endDate && dt > new Date(endDate + 'T23:59:59Z')) return false
    if (filterStatus && c.status !== filterStatus) return false
    return true
  })

  const closed  = filtered.filter(c => c.status === 'sale_closed').length
  const lost    = filtered.filter(c => c.status === 'sale_lost').length
  const handoff = filtered.filter(c => c.status === 'human_handoff').length
  const convRate = filtered.length > 0 ? Math.round((closed / filtered.length) * 100) : 0

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EAF0]">Reportes</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Análisis de conversaciones y ventas</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center bg-[#141720] border border-[#2A2F42] rounded-2xl px-4 py-3">
        <Calendar size={15} className="text-[#6B7280]" />
        <div className="flex items-center gap-2">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl" />
          <span className="text-[#6B7280] text-sm">→</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as ConvStatus | '')}
          className="px-3 py-2 text-sm rounded-xl">
          <option value="">Todos los estados</option>
          <option value="sale_closed">Ventas cerradas</option>
          <option value="sale_lost">Ventas perdidas</option>
          <option value="human_handoff">Derivados a humano</option>
          <option value="active">En curso</option>
        </select>
        {(startDate || endDate || filterStatus) && (
          <button onClick={() => { setStartDate(''); setEndDate(''); setFilterStatus('') }}
            className="text-xs text-[#6B7280] hover:text-[#E8EAF0] transition-colors cursor-pointer">
            Limpiar ✕
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Clientes atendidos" value={filtered.length} icon={<Users size={20} />} color="violet" trend="Total conversaciones" trendUp />
        <KPICard title="Ventas concretadas" value={closed} icon={<ShoppingBag size={20} />} color="green" trend={`${convRate}% tasa de cierre`} trendUp />
        <KPICard title="Ventas perdidas" value={lost} icon={<XCircle size={20} />} color="red" trend="Sin concretar" />
        <KPICard title="Derivados a humano" value={handoff} icon={<PhoneCall size={20} />} color="yellow" trend="A +51 924 940 724" trendUp />
      </div>

      {/* Barra visual de distribución */}
      <div className="bg-[#141720] border border-[#2A2F42] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-[#E8EAF0] mb-4">Distribución de conversaciones</h3>
        <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
          {closed > 0   && <div className="bg-[#00E5A0] transition-all" style={{ width: `${(closed/filtered.length)*100}%` }} title="Ventas cerradas" />}
          {lost > 0     && <div className="bg-[#FF4D6A] transition-all" style={{ width: `${(lost/filtered.length)*100}%` }} title="Ventas perdidas" />}
          {handoff > 0  && <div className="bg-[#F59E0B] transition-all" style={{ width: `${(handoff/filtered.length)*100}%` }} title="Derivados" />}
          {filtered.filter(c=>c.status==='active').length > 0 && (
            <div className="bg-[#7B61FF] flex-1" title="En curso" />
          )}
        </div>
        <div className="flex gap-4 mt-3">
          {[
            { color: 'bg-[#00E5A0]', label: 'Ventas cerradas' },
            { color: 'bg-[#FF4D6A]', label: 'Ventas perdidas' },
            { color: 'bg-[#F59E0B]', label: 'Derivados' },
            { color: 'bg-[#7B61FF]', label: 'En curso' },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-[#6B7280]">
              <span className={`w-2.5 h-2.5 rounded-sm ${color}`} /> {label}
            </span>
          ))}
        </div>
      </div>

      {/* Tabla de conversaciones */}
      <div className="bg-[#141720] border border-[#2A2F42] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2A2F42]">
          <h3 className="text-sm font-semibold text-[#E8EAF0]">Historial de conversaciones</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2F42] bg-[#0D0F14]">
                {['Cliente', 'Estado', 'Intención detectada', 'Mensajes', 'Inicio', 'Último mensaje'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2F42]">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-[#6B7280]">No hay conversaciones en este período</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="hover:bg-[#1C2030] transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-medium text-[#E8EAF0]">{c.user_phone}</span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={STATUS_BADGE[c.status]} label={STATUS_LABELS[c.status]} />
                  </td>
                  <td className="px-5 py-4 max-w-xs">
                    <span className="text-sm text-[#6B7280] line-clamp-2">{c.intent_summary ?? '—'}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-medium text-[#E8EAF0]">{c.message_count}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs text-[#6B7280]">{formatDt(c.started_at)}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs text-[#6B7280]">{formatDt(c.last_message_at)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[#2A2F42] bg-[#0D0F14]">
          <p className="text-xs text-[#6B7280]">{filtered.length} conversaciones</p>
        </div>
      </div>
    </div>
  )
}
