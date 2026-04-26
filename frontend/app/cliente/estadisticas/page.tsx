'use client'

import { Card, StatCard } from '@/components/ui/Card'
import { MessagesChart } from '@/components/charts/MessagesChart'
import { mockClientMessageStats, mockLeads } from '@/lib/mock-data'
import { MessageSquare, TrendingUp, Users, CheckCircle } from 'lucide-react'

const stageColors: Record<string, string> = {
  nuevo:      'bg-blue-500',
  contactado: 'bg-yellow-500',
  calificado: 'bg-purple-500',
  propuesta:  'bg-orange-500',
  cerrado:    'bg-green-500',
}

export default function ClienteEstadisticasPage() {
  const leads = mockLeads.filter(l => l.clientId === '1')
  const totalSent = mockClientMessageStats.reduce((s, d) => s + d.sent, 0)
  const totalReceived = mockClientMessageStats.reduce((s, d) => s + d.received, 0)
  const stages = ['nuevo', 'contactado', 'calificado', 'propuesta', 'cerrado']
  const stageCount = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.stage] = (acc[l.stage] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#e8e8f0]">Mis Estadísticas</h2>
        <p className="text-sm text-[#8888aa] mt-0.5">Rendimiento de tu chatbot</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Mensajes enviados" value={totalSent} icon={<MessageSquare size={20} />} color="violet" />
        <StatCard title="Mensajes recibidos" value={totalReceived} icon={<TrendingUp size={20} />} color="cyan" />
        <StatCard title="Total leads" value={leads.length} icon={<Users size={20} />} color="green" />
        <StatCard title="Leads cerrados" value={stageCount['cerrado'] ?? 0} icon={<CheckCircle size={20} />} color="yellow" />
      </div>

      <Card>
        <MessagesChart data={mockClientMessageStats} title="Mensajes por día (últimos 7 días)" />
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-[#e8e8f0] mb-4">Funnel de Leads</h3>
        <div className="space-y-3">
          {stages.map(stage => {
            const count = stageCount[stage] ?? 0
            const total = leads.length || 1
            return (
              <div key={stage} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="capitalize text-[#e8e8f0]">{stage}</span>
                  <span className="text-[#8888aa]">{count} leads</span>
                </div>
                <div className="h-2 rounded-full bg-[#1e1e30] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${stageColors[stage]}`}
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
