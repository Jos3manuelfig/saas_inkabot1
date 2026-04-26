'use client'

import { Card, StatCard } from '@/components/ui/Card'
import { MessagesChart } from '@/components/charts/MessagesChart'
import { mockMessageStats, mockClients } from '@/lib/mock-data'
import { TrendingUp, MessageSquare, Users, Activity } from 'lucide-react'

export default function EstadisticasPage() {
  const totalMsgs = mockMessageStats.reduce((s, d) => s + d.sent + d.received, 0)
  const avgPerDay = Math.round(totalMsgs / mockMessageStats.length)
  const activeClients = mockClients.filter(c => c.status === 'active').length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#e8e8f0]">Estadísticas</h2>
        <p className="text-sm text-[#8888aa] mt-0.5">Análisis global de la plataforma</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total mensajes (7d)" value={totalMsgs.toLocaleString()} icon={<MessageSquare size={20} />} color="violet" />
        <StatCard title="Promedio por día" value={avgPerDay.toLocaleString()} icon={<Activity size={20} />} color="cyan" />
        <StatCard title="Clientes activos" value={activeClients} icon={<Users size={20} />} color="green" />
        <StatCard title="Tasa de respuesta" value="94%" icon={<TrendingUp size={20} />} color="yellow" />
      </div>

      <Card>
        <MessagesChart data={mockMessageStats} title="Mensajes de toda la plataforma (últimos 7 días)" />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-[#e8e8f0] mb-4">Top clientes por mensajes</h3>
          <div className="space-y-3">
            {mockClients.slice(0, 4).map((c, i) => {
              const msgs = [523, 412, 287, 198, 134][i]
              const max = 523
              return (
                <div key={c.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#e8e8f0]">{c.name}</span>
                    <span className="text-[#8888aa]">{msgs.toLocaleString()} msgs</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1e1e30] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#6c3fff] to-[#00e5ff]"
                      style={{ width: `${(msgs / max) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-[#e8e8f0] mb-4">Distribución por plan</h3>
          <div className="space-y-4 py-2">
            {[
              { plan: 'Básico', count: 2, color: '#8888aa' },
              { plan: 'Pro', count: 2, color: '#6c3fff' },
              { plan: 'Enterprise', count: 1, color: '#00e5ff' },
            ].map(({ plan, count, color }) => (
              <div key={plan} className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-sm" style={{ background: color }} />
                <span className="text-sm text-[#e8e8f0] w-20">{plan}</span>
                <div className="flex-1 h-1.5 rounded-full bg-[#1e1e30] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(count / 5) * 100}%`, background: color }} />
                </div>
                <span className="text-xs text-[#8888aa] w-4">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
