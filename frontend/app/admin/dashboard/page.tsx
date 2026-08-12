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
        <h1 className="text-2xl font-bold text-[#F2F2F2]">Dashboard</h1>
        <p className="text-sm text-[#8A8A8A] mt-0.5">Resumen general de INKABOT</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Total Clientes" value={mockClients.length} icon={<Users size={20} />} trend="2 este mes" trendUp color="violet" />
        <KPICard title="Clientes Activos" value={activeClients} icon={<UserCheck size={20} />} trend={`${Math.round(activeClients/mockClients.length*100)}% del total`} trendUp color="green" />
        <KPICard title="Mensajes Hoy" value={(todayMsgs.sent + todayMsgs.received).toLocaleString()} icon={<MessageSquare size={20} />} trend="23% vs ayer" trendUp color="violet" />
        <KPICard title="Ingresos del Mes" value={`S/ ${monthRevenue.toLocaleString()}`} icon={<DollarSign size={20} />} trend="12% vs mes anterior" trendUp color="yellow" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[#F2F2F2] mb-5">Mensajes por día (últimos 7 días)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mockMessageStats} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF7A1A" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF7A1A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E5A0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00E5A0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis dataKey="date" tick={{ fill: '#8A8A8A', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8A8A8A', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 10, color: '#F2F2F2', fontSize: 12 }}
                labelStyle={{ color: '#8A8A8A' }}
                formatter={((v: unknown, name: unknown) => [v, name === 'sent' ? 'Enviados' : 'Recibidos']) as never}
              />
              <Area type="monotone" dataKey="sent" stroke="#FF7A1A" strokeWidth={2} fill="url(#gV)" />
              <Area type="monotone" dataKey="received" stroke="#00E5A0" strokeWidth={2} fill="url(#gG)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-xs text-[#8A8A8A]"><span className="w-2.5 h-0.5 bg-[#FF7A1A] rounded" />Enviados</span>
            <span className="flex items-center gap-1.5 text-xs text-[#8A8A8A]"><span className="w-2.5 h-0.5 bg-[#00E5A0] rounded" />Recibidos</span>
          </div>
        </div>

        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[#F2F2F2] mb-4">Estado de bots</h3>
          <div className="space-y-3">
            {mockClients.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-[#2A2A2A] last:border-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${c.botActive ? 'bg-[#00E5A0]' : 'bg-[#FF4D6A]'}`} />
                  <span className="text-sm text-[#F2F2F2] truncate">{c.name}</span>
                </div>
                {c.waStatus === 'connected'
                  ? <Wifi size={13} className="text-[#00E5A0] shrink-0" />
                  : <WifiOff size={13} className="text-[#FF4D6A] shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
          <h3 className="text-sm font-semibold text-[#F2F2F2]">Clientes</h3>
          <button onClick={() => router.push('/admin/clientes')} className="text-xs text-[#FF7A1A] hover:text-[#00E5A0] transition-colors cursor-pointer">
            Ver todos →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A] bg-[#0A0A0A]">
                {['Cliente', 'Plan', 'WhatsApp', 'Estado', 'Vencimiento', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-[#8A8A8A] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {mockClients.map(c => {
                const days = daysUntil(c.expiryDate)
                return (
                  <tr key={c.id} className={`hover:bg-[#1C1C1C] transition-colors ${c.status === 'inactive' ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-[#F2F2F2]">{c.name}</p>
                      <p className="text-xs text-[#8A8A8A]">{c.email}</p>
                    </td>
                    <td className="px-5 py-3.5"><PlanBadge plan={c.plan} /></td>
                    <td className="px-5 py-3.5"><StatusBadge status={c.waStatus} /></td>
                    <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-3.5">
                      <span className={`text-sm ${days <= 7 ? 'text-[#FF4D6A] font-medium' : days <= 30 ? 'text-[#F59E0B]' : 'text-[#8A8A8A]'}`}>
                        {formatDate(c.expiryDate)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => router.push('/admin/clientes')} className="flex items-center gap-1 text-xs text-[#8A8A8A] hover:text-[#FF7A1A] transition-colors cursor-pointer">
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
