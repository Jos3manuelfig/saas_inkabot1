'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Phone, MessageSquare, Wifi, WifiOff, Bot, PlusCircle, CheckCircle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { KPICard } from '@/components/ui/KPICard'
import { StatusBadge, PlanBadge } from '@/components/ui/StatusBadge'
import { mockClients, mockPayments, mockMessageStats, formatDate, daysUntil } from '@/lib/mock-data'

function Box({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-[#141720] border border-[#2A2F42] rounded-2xl ${className}`}>{children}</div>
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const client = mockClients.find(c => c.id === id) ?? mockClients[0]
  const payments = mockPayments.filter(p => p.clientId === client.id)
  const days = daysUntil(client.expiryDate)
  const totalSent = mockMessageStats.reduce((s, d) => s + d.sent, 0)
  const totalReceived = mockMessageStats.reduce((s, d) => s + d.received, 0)

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#6B7280] hover:text-[#E8EAF0] hover:bg-[#1C2030] rounded-xl transition-colors cursor-pointer">
          <ArrowLeft size={14} /> Volver
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#E8EAF0]">{client.name}</h1>
          <p className="text-sm text-[#6B7280]">{client.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Box className="p-5">
          <h3 className="text-sm font-semibold text-[#E8EAF0] mb-4">Información</h3>
          <div className="space-y-3">
            {[
              { label: 'Bot', value: <div className="flex items-center gap-1.5"><Bot size={13} className={client.botActive ? 'text-[#00E5A0]' : 'text-[#FF4D6A]'} /><span className={`text-xs font-medium ${client.botActive ? 'text-[#00E5A0]' : 'text-[#FF4D6A]'}`}>{client.botActive ? 'Activo' : 'Inactivo'}</span></div> },
              { label: 'WhatsApp', value: <StatusBadge status={client.waStatus} /> },
              { label: 'Número', value: <div className="flex items-center gap-1 text-xs text-[#E8EAF0]"><Phone size={11} />{client.phone}</div> },
              { label: 'Plan', value: <PlanBadge plan={client.plan} /> },
              { label: 'Estado', value: <StatusBadge status={client.status} /> },
              { label: 'Vencimiento', value: <span className={`text-xs font-medium ${days <= 7 ? 'text-[#FF4D6A]' : 'text-[#6B7280]'}`}>{formatDate(client.expiryDate)}</span> },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-[#2A2F42] last:border-0">
                <span className="text-xs text-[#6B7280]">{label}</span>
                {value}
              </div>
            ))}
          </div>
        </Box>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 content-start">
          <KPICard title="Msgs enviados" value={totalSent} icon={<MessageSquare size={18} />} color="violet" />
          <KPICard title="Msgs recibidos" value={totalReceived} icon={<MessageSquare size={18} />} color="green" />
          <KPICard title="Leads cerrados" value={5} icon={<CheckCircle size={18} />} color="yellow" />
        </div>
      </div>

      <Box className="p-5">
        <h3 className="text-sm font-semibold text-[#E8EAF0] mb-4">Mensajes (últimos 7 días)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={mockMessageStats} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="adV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7B61FF" stopOpacity={0.3} /><stop offset="95%" stopColor="#7B61FF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2F42" />
            <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#1C2030', border: '1px solid #2A2F42', borderRadius: 10, color: '#E8EAF0', fontSize: 12 }} />
            <Area type="monotone" dataKey="sent" stroke="#7B61FF" strokeWidth={2} fill="url(#adV)" name="Enviados" />
            <Area type="monotone" dataKey="received" stroke="#00E5A0" strokeWidth={2} fill="none" name="Recibidos" />
          </AreaChart>
        </ResponsiveContainer>
      </Box>

      <Box className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2F42]">
          <h3 className="text-sm font-semibold text-[#E8EAF0]">Historial de pagos</h3>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl bg-[#7B61FF] text-white hover:bg-[#5B41DF] transition-colors cursor-pointer">
            <PlusCircle size={13} /> Registrar pago
          </button>
        </div>
        {payments.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#6B7280]">No hay pagos registrados</p>
        ) : (
          <div className="divide-y divide-[#2A2F42]">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#1C2030] transition-colors">
                <div>
                  <p className="text-sm font-medium text-[#E8EAF0]">{p.plan}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">{formatDate(p.date)} · {p.method}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-[#00E5A0]">S/ {p.amount}</span>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Box>
    </div>
  )
}
