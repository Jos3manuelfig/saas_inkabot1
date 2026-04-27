'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Users, CheckCircle, Bot, AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { KPICard } from '@/components/ui/KPICard'
import { StatusBadge, PlanBadge } from '@/components/ui/StatusBadge'
import { mockClients, mockMessageStats, daysUntil, formatDate } from '@/lib/mock-data'
import { getSession } from '@/lib/auth'
import type { Client } from '@/lib/mock-data'

export default function ClienteDashboard() {
  const [client, setClient] = useState<Client | null>(null)

  useEffect(() => {
    const session = getSession()
    const clientId = session?.user.clientId
    setClient(clientId ? (mockClients.find(c => c.id === clientId) ?? mockClients[0]) : mockClients[0])
  }, [])

  if (!client) return null

  const today = mockMessageStats[mockMessageStats.length - 1]
  const totalToday = today.sent + today.received
  const days = daysUntil(client.expiryDate)
  const isExpiring = days <= 10

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EAF0]">Mi Dashboard</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">{client.name}</p>
      </div>

      {isExpiring && (
        <div className="flex items-center gap-3 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3">
          <AlertTriangle size={18} className="text-[#F59E0B] shrink-0" />
          <p className="text-sm text-[#F59E0B]">
            Tu plan vence en <span className="font-bold">{days} días</span> ({formatDate(client.expiryDate)}). Contacta a soporte para renovar.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Mensajes hoy" value={totalToday.toLocaleString()} icon={<MessageSquare size={20} />} trend={`${today.sent} enviados / ${today.received} recibidos`} trendUp color="violet" />
        <KPICard title="Leads activos" value={12} icon={<Users size={20} />} trend="En seguimiento" trendUp color="green" />
        <KPICard title="Leads cerrados" value={5} icon={<CheckCircle size={20} />} trend="Este mes" trendUp color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#141720] border border-[#2A2F42] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[#E8EAF0] mb-4">Conversaciones por día (últimos 7 días)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mockMessageStats} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
              <Area type="monotone" dataKey="sent" stroke="#7B61FF" strokeWidth={2} fill="url(#cgV)" name="Mensajes" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="bg-[#141720] border border-[#2A2F42] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[#E8EAF0] mb-4">Estado del bot</h3>
            <div className="flex flex-col items-center py-3 gap-3">
              <div className={`relative flex h-16 w-16 items-center justify-center rounded-full ${client.botActive ? 'bg-[#00E5A0]/10' : 'bg-[#FF4D6A]/10'}`}>
                {client.botActive && <span className="absolute inset-0 rounded-full animate-ping bg-[#00E5A0]/15" />}
                <Bot size={28} className={client.botActive ? 'text-[#00E5A0]' : 'text-[#FF4D6A]'} />
              </div>
              <div className="text-center space-y-1.5">
                <p className={`text-sm font-bold ${client.botActive ? 'text-[#00E5A0]' : 'text-[#FF4D6A]'}`}>
                  {client.botActive ? 'Bot Activo' : 'Bot Inactivo'}
                </p>
                <StatusBadge status={client.waStatus} />
              </div>
            </div>
          </div>

          <div className="bg-[#141720] border border-[#2A2F42] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[#E8EAF0] mb-3">Mi plan</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#6B7280]">Plan actual</span>
                <PlanBadge plan={client.plan} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#6B7280]">Vencimiento</span>
                <span className={`text-xs font-medium ${isExpiring ? 'text-[#F59E0B]' : 'text-[#E8EAF0]'}`}>{formatDate(client.expiryDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#6B7280]">Días restantes</span>
                <span className={`text-sm font-bold ${isExpiring ? 'text-[#F59E0B]' : 'text-[#00E5A0]'}`}>{days}d</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
