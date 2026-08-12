'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { KPICard } from '@/components/ui/KPICard'
import { mockMessageStats, mockClients } from '@/lib/mock-data'
import { TrendingUp, MessageSquare, Users, Activity } from 'lucide-react'

export default function EstadisticasPage() {
  const totalMsgs = mockMessageStats.reduce((s, d) => s + d.sent + d.received, 0)
  const avgPerDay = Math.round(totalMsgs / mockMessageStats.length)
  const activeClients = mockClients.filter(c => c.status === 'active').length
  const topMsgs = [523, 412, 287, 198, 134]
  const maxMsgs = topMsgs[0]

  const planDist = [
    { plan: 'Emprendedor', count: 1, color: '#8A8A8A' },
    { plan: 'Pro',         count: 2, color: '#FF7A1A' },
    { plan: 'Enterprise',  count: 1, color: '#00E5A0' },
    { plan: 'Básico',      count: 1, color: '#F59E0B' },
  ]

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-[#F2F2F2]">Estadísticas</h1>
        <p className="text-sm text-[#8A8A8A] mt-0.5">Análisis global de la plataforma</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Total mensajes (7d)" value={totalMsgs.toLocaleString()} icon={<MessageSquare size={20} />} color="violet" />
        <KPICard title="Promedio por día" value={avgPerDay.toLocaleString()} icon={<Activity size={20} />} color="green" />
        <KPICard title="Clientes activos" value={activeClients} icon={<Users size={20} />} color="violet" />
        <KPICard title="Tasa de respuesta" value="94%" icon={<TrendingUp size={20} />} color="yellow" />
      </div>

      <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-[#F2F2F2] mb-4">Mensajes de la plataforma (últimos 7 días)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={mockMessageStats} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="stV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF7A1A" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF7A1A" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="stG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00E5A0" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00E5A0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
            <XAxis dataKey="date" tick={{ fill: '#8A8A8A', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8A8A8A', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, color: '#F2F2F2', fontSize: 12 }} />
            <Area type="monotone" dataKey="sent" stroke="#FF7A1A" strokeWidth={2} fill="url(#stV)" name="Enviados" />
            <Area type="monotone" dataKey="received" stroke="#00E5A0" strokeWidth={2} fill="url(#stG)" name="Recibidos" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[#F2F2F2] mb-4">Top clientes por mensajes</h3>
          <div className="space-y-4">
            {mockClients.slice(0, 4).map((c, i) => (
              <div key={c.id} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#F2F2F2]">{c.name}</span>
                  <span className="text-[#8A8A8A]">{topMsgs[i].toLocaleString()} msgs</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#2A2A2A] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#FF7A1A] to-[#00E5A0]"
                    style={{ width: `${(topMsgs[i] / maxMsgs) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[#F2F2F2] mb-4">Distribución por plan</h3>
          <div className="space-y-4">
            {planDist.map(({ plan, count, color }) => (
              <div key={plan} className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: color }} />
                <span className="text-sm text-[#F2F2F2] w-24">{plan}</span>
                <div className="flex-1 h-1.5 rounded-full bg-[#2A2A2A] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(count / 5) * 100}%`, background: color }} />
                </div>
                <span className="text-xs text-[#8A8A8A] w-4 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
