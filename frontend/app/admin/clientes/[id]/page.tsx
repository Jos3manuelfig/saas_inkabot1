'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Phone, MessageSquare, Users, CheckCircle,
  Wifi, WifiOff, Bot, PlusCircle,
} from 'lucide-react'
import { Card, StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { MessagesChart } from '@/components/charts/MessagesChart'
import { mockClients, mockLeads, mockPayments, mockClientMessageStats } from '@/lib/mock-data'
import type { Payment, Lead } from '@/types'

interface Props { params: Promise<{ id: string }> }

const stageColors: Record<string, string> = {
  nuevo:      'bg-blue-500/10 text-blue-400 border-blue-500/20',
  contactado: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  calificado: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  propuesta:  'bg-orange-500/10 text-orange-400 border-orange-500/20',
  cerrado:    'bg-green-500/10 text-green-400 border-green-500/20',
}

export default function ClientDetailPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()

  const client = mockClients.find(c => c.id === id)
  if (!client) return (
    <div className="flex items-center justify-center h-64 text-[#8888aa]">Cliente no encontrado</div>
  )

  const leads = mockLeads.filter(l => l.clientId === id)
  const payments = mockPayments.filter(p => p.clientId === id)

  const stageCount = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.stage] = (acc[l.stage] || 0) + 1
    return acc
  }, {})

  const stages = ['nuevo', 'contactado', 'calificado', 'propuesta', 'cerrado']

  const paymentCols = [
    { key: 'date',   header: 'Fecha',   render: (p: Payment) => <span className="text-sm text-[#8888aa]">{new Date(p.date).toLocaleDateString('es-PE')}</span> },
    { key: 'plan',   header: 'Plan',    render: (p: Payment) => <span className="text-sm text-[#e8e8f0]">{p.plan}</span> },
    { key: 'amount', header: 'Monto',   render: (p: Payment) => <span className="text-sm font-medium text-[#00e5ff]">S/ {p.amount}</span> },
    { key: 'method', header: 'Método',  render: (p: Payment) => <span className="text-sm text-[#8888aa]">{p.method}</span> },
    { key: 'status', header: 'Estado',  render: (p: Payment) => <Badge variant={p.status} /> },
  ]

  const leadCols = [
    { key: 'name',  header: 'Nombre',  render: (l: Lead) => <span className="text-sm font-medium text-[#e8e8f0]">{l.name}</span> },
    { key: 'phone', header: 'Teléfono',render: (l: Lead) => <span className="text-sm text-[#8888aa]">{l.phone}</span> },
    {
      key: 'stage', header: 'Etapa',
      render: (l: Lead) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${stageColors[l.stage]}`}>
          {l.stage}
        </span>
      ),
    },
    { key: 'date', header: 'Fecha', render: (l: Lead) => <span className="text-xs text-[#8888aa]">{new Date(l.createdAt).toLocaleDateString('es-PE')}</span> },
  ]

  const totalSent = mockClientMessageStats.reduce((s, d) => s + d.sent, 0)
  const totalReceived = mockClientMessageStats.reduce((s, d) => s + d.received, 0)
  const closedLeads = leads.filter(l => l.stage === 'cerrado').length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft size={14} /> Volver
        </Button>
        <div>
          <h2 className="text-xl font-bold text-[#e8e8f0]">{client.name}</h2>
          <p className="text-sm text-[#8888aa]">{client.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <h3 className="text-sm font-semibold text-[#e8e8f0] mb-4">Información del cliente</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8888aa]">Estado bot</span>
              <div className="flex items-center gap-1.5">
                <Bot size={13} className={client.botActive ? 'text-green-400' : 'text-red-400'} />
                <span className={`text-xs font-medium ${client.botActive ? 'text-green-400' : 'text-red-400'}`}>
                  {client.botActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8888aa]">WhatsApp</span>
              <div className="flex items-center gap-1.5">
                {client.whatsappStatus === 'connected'
                  ? <Wifi size={13} className="text-green-400" />
                  : <WifiOff size={13} className="text-red-400" />}
                <Badge variant={client.whatsappStatus} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8888aa]">Número WA</span>
              <div className="flex items-center gap-1.5 text-xs text-[#e8e8f0]">
                <Phone size={12} /> {client.whatsappNumber}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8888aa]">Plan</span>
              <span className="text-xs font-medium text-[#6c3fff] bg-[#6c3fff]/10 px-2 py-0.5 rounded-full border border-[#6c3fff]/20">
                {client.plan}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8888aa]">Estado cuenta</span>
              <Badge variant={client.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8888aa]">Vencimiento</span>
              <span className={`text-xs ${client.status === 'expiring' ? 'text-yellow-400 font-medium' : 'text-[#8888aa]'}`}>
                {new Date(client.expiryDate).toLocaleDateString('es-PE')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8888aa]">Cliente desde</span>
              <span className="text-xs text-[#8888aa]">{new Date(client.createdAt).toLocaleDateString('es-PE')}</span>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 content-start">
          <StatCard title="Msgs enviados" value={totalSent} icon={<MessageSquare size={18} />} color="violet" />
          <StatCard title="Msgs recibidos" value={totalReceived} icon={<MessageSquare size={18} />} color="cyan" />
          <StatCard title="Leads cerrados" value={closedLeads} icon={<CheckCircle size={18} />} color="green" />
        </div>
      </div>

      <Card>
        <MessagesChart data={mockClientMessageStats} title="Mensajes últimos 7 días" />
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-[#e8e8f0] mb-4">Funnel de Leads</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          {stages.map((stage, i) => {
            const count = stageCount[stage] || 0
            const maxCount = Math.max(...stages.map(s => stageCount[s] || 0), 1)
            const widthPct = Math.max(20, (count / maxCount) * 100)
            return (
              <div key={stage} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="relative w-full rounded-lg overflow-hidden bg-[#0f0f1a] h-12 flex items-center justify-center"
                  style={{ clipPath: i < stages.length - 1 ? 'polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%)' : undefined }}>
                  <div className={`absolute left-0 top-0 h-full rounded-lg ${stageColors[stage].split(' ')[0]}`}
                    style={{ width: `${widthPct}%` }} />
                  <span className={`relative z-10 text-sm font-bold ${stageColors[stage].split(' ')[1]}`}>{count}</span>
                </div>
                <span className="text-[10px] capitalize text-[#8888aa]">{stage}</span>
              </div>
            )
          })}
        </div>
        <div className="mt-4">
          <Table columns={leadCols} data={leads} pageSize={4} />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#e8e8f0]">Historial de pagos</h3>
          <Button size="sm">
            <PlusCircle size={13} /> Registrar pago
          </Button>
        </div>
        <Table columns={paymentCols} data={payments} pageSize={5} />
      </Card>
    </div>
  )
}
