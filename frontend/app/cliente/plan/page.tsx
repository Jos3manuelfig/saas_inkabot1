'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { mockClients, mockPayments } from '@/lib/mock-data'
import { mockPayments as payments } from '@/lib/mock-data'
import { Star, CheckCircle, AlertTriangle } from 'lucide-react'
import { getSession } from '@/lib/auth'
import type { Client, Payment } from '@/types'

const planFeatures: Record<string, string[]> = {
  'Básico':     ['500 mensajes/día', '1 número WhatsApp', 'Soporte por email', 'Dashboard básico'],
  'Pro':        ['2,000 mensajes/día', '1 número WhatsApp', 'Soporte prioritario', 'Dashboard completo', 'Estadísticas avanzadas'],
  'Enterprise': ['Sin límite de mensajes', 'Múltiples números', 'Soporte 24/7', 'Dashboard completo', 'API access', 'Integración personalizada'],
}

export default function MiPlanPage() {
  const [client, setClient] = useState<Client | null>(null)

  useEffect(() => {
    const session = getSession()
    const clientId = session?.user.clientId ?? '1'
    setClient(mockClients.find(c => c.id === clientId) ?? mockClients[0])
  }, [])

  if (!client) return null

  const myPayments = payments.filter(p => p.clientId === client.id)
  const daysLeft = Math.ceil((new Date(client.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const isExpiring = daysLeft <= 10
  const features = planFeatures[client.plan] ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#e8e8f0]">Mi Plan</h2>
        <p className="text-sm text-[#8888aa] mt-0.5">Detalles de tu suscripción</p>
      </div>

      {isExpiring && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
          <AlertTriangle size={18} className="text-yellow-400 shrink-0" />
          <p className="text-sm text-yellow-300">
            Tu plan vence en <span className="font-semibold">{daysLeft} días</span>. Contacta a soporte para renovar tu suscripción.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card glow="violet">
          <div className="flex items-center gap-2.5 mb-4">
            <Star size={16} className="text-[#6c3fff]" />
            <h3 className="text-sm font-semibold text-[#e8e8f0]">Plan actual</h3>
          </div>
          <div className="text-center py-4">
            <span className="inline-block text-3xl font-bold text-[#6c3fff] bg-[#6c3fff]/10 px-6 py-2 rounded-xl border border-[#6c3fff]/30">
              {client.plan}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {features.map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-[#e8e8f0]">
                <CheckCircle size={14} className="text-[#6c3fff] shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-[#e8e8f0] mb-4">Detalles de suscripción</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#8888aa]">Estado</span>
              <Badge variant={client.status} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#8888aa]">Número WhatsApp</span>
              <span className="text-sm text-[#e8e8f0]">{client.whatsappNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#8888aa]">Fecha vencimiento</span>
              <span className={`text-sm font-medium ${isExpiring ? 'text-yellow-400' : 'text-[#e8e8f0]'}`}>
                {new Date(client.expiryDate).toLocaleDateString('es-PE')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#8888aa]">Días restantes</span>
              <span className={`text-lg font-bold ${isExpiring ? 'text-yellow-400' : 'text-[#00e5ff]'}`}>
                {daysLeft} días
              </span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[#1e1e30]">
            <Button className="w-full justify-center">Solicitar renovación</Button>
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-[#e8e8f0] mb-4">Historial de pagos</h3>
        <div className="space-y-2">
          {myPayments.map(p => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-[#1e1e30] px-4 py-3">
              <div>
                <p className="text-sm text-[#e8e8f0]">{p.plan}</p>
                <p className="text-xs text-[#8888aa]">{new Date(p.date).toLocaleDateString('es-PE')} · {p.method}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#00e5ff]">S/ {p.amount}</span>
                <Badge variant={p.status} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
