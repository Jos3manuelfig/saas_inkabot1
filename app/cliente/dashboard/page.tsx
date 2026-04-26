'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Users, CheckCircle, Bot, AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import { StatCard, Card } from '@/components/ui/Card'
import { MessagesChart } from '@/components/charts/MessagesChart'
import { mockClients, mockClientMessageStats, mockLeads } from '@/lib/mock-data'
import { getSession } from '@/lib/auth'
import type { Client } from '@/types'

export default function ClienteDashboard() {
  const [client, setClient] = useState<Client | null>(null)

  useEffect(() => {
    const session = getSession()
    if (session?.user.clientId) {
      const c = mockClients.find(c => c.id === session.user.clientId)
      setClient(c ?? mockClients[0])
    } else {
      setClient(mockClients[0])
    }
  }, [])

  if (!client) return null

  const leads = mockLeads.filter(l => l.clientId === client.id)
  const activeLeads = leads.filter(l => l.stage !== 'cerrado').length
  const closedLeads = leads.filter(l => l.stage === 'cerrado').length
  const todayMessages = mockClientMessageStats[mockClientMessageStats.length - 1]
  const daysLeft = Math.ceil((new Date(client.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const isExpiring = daysLeft <= 10

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#e8e8f0]">Mi Dashboard</h2>
        <p className="text-sm text-[#8888aa] mt-0.5">{client.name}</p>
      </div>

      {isExpiring && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
          <AlertTriangle size={18} className="text-yellow-400 shrink-0" />
          <p className="text-sm text-yellow-300">
            Tu plan vence en <span className="font-semibold">{daysLeft} días</span> ({new Date(client.expiryDate).toLocaleDateString('es-PE')}). Contacta a soporte para renovar.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Mensajes hoy"
          value={(todayMessages.sent + todayMessages.received).toLocaleString()}
          icon={<MessageSquare size={20} />}
          trend={`${todayMessages.sent} enviados / ${todayMessages.received} recibidos`}
          color="violet"
        />
        <StatCard
          title="Leads activos"
          value={activeLeads}
          icon={<Users size={20} />}
          trend="En seguimiento"
          color="cyan"
        />
        <StatCard
          title="Leads cerrados"
          value={closedLeads}
          icon={<CheckCircle size={20} />}
          trend="Este mes"
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <MessagesChart data={mockClientMessageStats} title="Conversaciones por día (últimos 7 días)" />
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-[#e8e8f0] mb-4">Estado del bot</h3>
            <div className="flex flex-col items-center py-4 gap-3">
              <div className={`relative flex h-20 w-20 items-center justify-center rounded-full ${client.botActive ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
                {client.botActive && (
                  <span className="absolute inset-0 rounded-full animate-ping bg-green-400/20" />
                )}
                <Bot size={36} className={client.botActive ? 'text-green-400' : 'text-red-400'} />
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${client.botActive ? 'text-green-400' : 'text-red-400'}`}>
                  {client.botActive ? 'Bot Activo' : 'Bot Inactivo'}
                </p>
                <div className="mt-1.5 flex items-center justify-center gap-1.5 text-sm">
                  {client.whatsappStatus === 'connected'
                    ? <><Wifi size={14} className="text-green-400" /><span className="text-green-400">WhatsApp conectado</span></>
                    : <><WifiOff size={14} className="text-red-400" /><span className="text-red-400">WhatsApp desconectado</span></>}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-[#e8e8f0] mb-3">Mi plan</h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8888aa]">Plan actual</span>
                <span className="text-xs font-medium text-[#6c3fff] bg-[#6c3fff]/10 px-2 py-0.5 rounded-full border border-[#6c3fff]/20">
                  {client.plan}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8888aa]">Vencimiento</span>
                <span className={`text-xs font-medium ${isExpiring ? 'text-yellow-400' : 'text-[#e8e8f0]'}`}>
                  {new Date(client.expiryDate).toLocaleDateString('es-PE')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8888aa]">Días restantes</span>
                <span className={`text-xs font-bold ${isExpiring ? 'text-yellow-400' : 'text-[#00e5ff]'}`}>
                  {daysLeft} días
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
