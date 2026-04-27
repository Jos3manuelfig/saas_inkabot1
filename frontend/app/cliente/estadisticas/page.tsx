'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { KPICard } from '@/components/ui/KPICard'
import { mockMessageStats } from '@/lib/mock-data'
import { MessageSquare, TrendingUp, Users, CheckCircle } from 'lucide-react'

const stages = [
  { label: 'Nuevo',      count: 4, color: '#7B61FF' },
  { label: 'Contactado', count: 3, color: '#F59E0B' },
  { label: 'Calificado', count: 2, color: '#00E5A0' },
  { label: 'Propuesta',  count: 2, color: '#3B82F6' },
  { label: 'Cerrado',    count: 5, color: '#00E5A0' },
]

export default function ClienteEstadisticasPage() {
  const totalSent = mockMessageStats.reduce((s, d) => s + d.sent, 0)
  const totalReceived = mockMessageStats.reduce((s, d) => s + d.received, 0)
  const maxCount = Math.max(...stages.map(s => s.count))

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EAF0]">Mis Estadísticas</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Rendimiento de tu chatbot</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Mensajes enviados" value={totalSent} icon={<MessageSquare size={20} />} color="violet" />
        <KPICard title="Mensajes recibidos" value={totalReceived} icon={<TrendingUp size={20} />} color="green" />
        <KPICard title="Total leads" value={16} icon={<Users size={20} />} color="violet" />
        <KPICard title="Leads cerrados" value={5} icon={<CheckCircle size={20} />} color="yellow" />
      </div>

      <div className="bg-[#141720] border border-[#2A2F42] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-[#E8EAF0] mb-4">Mensajes por día (últimos 7 días)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={mockMessageStats} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="egV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7B61FF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7B61FF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2F42" />
            <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#1C2030', border: '1px solid #2A2F42', borderRadius: 10, color: '#E8EAF0', fontSize: 12 }} />
            <Area type="monotone" dataKey="sent" stroke="#7B61FF" strokeWidth={2} fill="url(#egV)" name="Enviados" />
            <Area type="monotone" dataKey="received" stroke="#00E5A0" strokeWidth={2} fill="none" name="Recibidos" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[#141720] border border-[#2A2F42] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-[#E8EAF0] mb-4">Funnel de Leads</h3>
        <div className="space-y-3">
          {stages.map(stage => (
            <div key={stage.label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#E8EAF0]">{stage.label}</span>
                <span className="text-[#6B7280]">{stage.count} leads</span>
              </div>
              <div className="h-2 rounded-full bg-[#2A2F42] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(stage.count / maxCount) * 100}%`, background: stage.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
