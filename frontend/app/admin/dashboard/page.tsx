'use client'

import { useRouter } from 'next/navigation'
import { Users, UserCheck, MessageSquare, DollarSign, Eye, Wifi, WifiOff } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { KPICard } from '@/components/ui/KPICard'
import { StatusBadge, PlanBadge } from '@/components/ui/StatusBadge'
import { mockClients, mockMessageStats, mockPayments, formatDate, daysUntil } from '@/lib/mock-data'

export default function AdminDashboard() {
  const router = useRouter()
  const activeClients = mockClients.filter(c => c.status === 'active').length
  const todayMsgs = mockMessageStats[mockMessageStats.length - 1]
  const monthRevenue = mockPayments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EAF0]">Dashboard</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Resumen general de INKABOT</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Total Clientes" value={mockClients.length} icon={<Users size={20} />} trend="2 este mes" trendUp color="violet" />
        <KPICard title="Clientes Activos" value={activeClients} icon={<UserCheck size={20} />} trend={`${Math.round(activeClients/mockClients.length*100)}% del total`} trendUp color="green" />
        <KPICard title="Mensajes Hoy" value={(todayMsgs.sent + todayMsgs.received).toLocaleString()} icon={<MessageSquare size={20} />} trend="23% vs ayer" trendUp color="violet" />
        <KPICard title="Ingresos del Mes" value={`S/ ${monthRevenue.toLocaleString()}`} icon={<DollarSign size={20} />} trend="12% vs mes anterior" trendUp color="yellow" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-[#141720] border border-[#2A2F42] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[#E8EAF0] mb-5">Mensajes por día (últimos 7 días)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mockMessageStats} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7B61FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7B61FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E5A0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00E5A0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2F42" />
              <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1C2030', border: '1px solid #2A2F42', borderRadius: 10, color: '#E8EAF0', fontSize: 12 }}
                labelStyle={{ color: '#6B7280' }}
                formatter={(v: number, name: string) => [v, name === 'sent' ? 'Enviados' : 'Recibidos']}
              />
              <Area type="monotone" dataKey="sent" stroke="#7B61FF" strokeWidth={2} fill="url(#gV)" />
              <Area type="monotone" dataKey="received" stroke="#00E5A0" strokeWidth={2} fill="url(#gG)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-xs text-[#6B7280]"><span className="w-2.5 h-0.5 bg-[#7B61FF] rounded" />Enviados</span>
            <span className="flex items-center gap-1.5 text-xs text-[#6B7280]"><span className="w-2.5 h-0.5 bg-[#00E5A0] rounded" />Recibidos</span>
          </div>
        </div>

        <div className="bg-[#141720] border border-[#2A2F42] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[#E8EAF0] mb-4">Estado de bots</h3>
          <div className="space-y-3">
            {mockClients.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-[#2A2F42] last:border-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${c.botActive ? 'bg-[#00E5A0]' : 'bg-[#FF4D6A]'}`} />
                  <span className="text-sm text-[#E8EAF0] truncate">{c.name}</span>
                </div>
                {c.waStatus === 'connected'
                  ? <Wifi size={13} className="text-[#00E5A0] shrink-0" />
                  : <WifiOff size={13} className="text-[#FF4D6A] shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#141720] border border-[#2A2F42] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2F42]">
          <h3 className="text-sm font-semibold text-[#E8EAF0]">Clientes</h3>
          <button onClick={() => router.push('/admin/clientes')} className="text-xs text-[#7B61FF] hover:text-[#00E5A0] transition-colors cursor-pointer">
            Ver todos →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2F42] bg-[#0D0F14]">
                {['Cliente', 'Plan', 'WhatsApp', 'Estado', 'Vencimiento', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2F42]">
              {mockClients.map(c => {
                const days = daysUntil(c.expiryDate)
                return (
                  <tr key={c.id} className={`hover:bg-[#1C2030] transition-colors ${c.status === 'inactive' ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-[#E8EAF0]">{c.name}</p>
                      <p className="text-xs text-[#6B7280]">{c.email}</p>
                    </td>
                    <td className="px-5 py-3.5"><PlanBadge plan={c.plan} /></td>
                    <td className="px-5 py-3.5"><StatusBadge status={c.waStatus} /></td>
                    <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-3.5">
                      <span className={`text-sm ${days <= 7 ? 'text-[#FF4D6A] font-medium' : days <= 30 ? 'text-[#F59E0B]' : 'text-[#6B7280]'}`}>
                        {formatDate(c.expiryDate)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => router.push('/admin/clientes')} className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#7B61FF] transition-colors cursor-pointer">
                        <Eye size={13} /> Ver
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
