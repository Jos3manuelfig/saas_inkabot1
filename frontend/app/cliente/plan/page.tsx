'use client'

import { useEffect, useState } from 'react'
import { Star, CheckCircle, AlertTriangle } from 'lucide-react'
import { StatusBadge, PlanBadge } from '@/components/ui/StatusBadge'
import { KPICard } from '@/components/ui/KPICard'
import { mockClients, mockPayments, daysUntil, formatDate, type Client } from '@/lib/mock-data'
import { getSession } from '@/lib/auth'

const planFeatures: Record<string, string[]> = {
  'Emprendedor': ['500 mensajes/día', '1 número WhatsApp', 'Soporte por email'],
  'Profesional': ['2,000 mensajes/día', '1 número WhatsApp', 'Soporte prioritario', 'Estadísticas avanzadas'],
  'Básico':      ['500 mensajes/día', '1 número WhatsApp', 'Soporte básico'],
  'Pro':         ['2,000 mensajes/día', '1 número WhatsApp', 'Soporte prioritario', 'Dashboard completo'],
  'Enterprise':  ['Sin límite de mensajes', 'Múltiples números', 'Soporte 24/7', 'API access'],
}

export default function MiPlanPage() {
  const [client, setClient] = useState<Client | null>(null)

  useEffect(() => {
    const session = getSession()
    const id = session?.user.clientId ?? '1'
    setClient(mockClients.find(c => c.id === id) ?? mockClients[0])
  }, [])

  if (!client) return null

  const payments = mockPayments.filter(p => p.clientId === client.id)
  const days = daysUntil(client.expiryDate)
  const isExpiring = days <= 10
  const features = planFeatures[client.plan] ?? []

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EAF0]">Mi Plan</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Detalles de tu suscripción</p>
      </div>

      {isExpiring && (
        <div className="flex items-center gap-3 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3">
          <AlertTriangle size={18} className="text-[#F59E0B] shrink-0" />
          <p className="text-sm text-[#F59E0B]">
            Tu plan vence en <span className="font-bold">{days} días</span>. Contacta a soporte para renovar.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#141720] border border-[#7B61FF]/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(123,97,255,0.1)]">
          <div className="flex items-center gap-2 mb-4">
            <Star size={16} className="text-[#7B61FF]" />
            <h3 className="text-sm font-semibold text-[#E8EAF0]">Plan actual</h3>
          </div>
          <div className="flex justify-center py-3">
            <PlanBadge plan={client.plan} />
          </div>
          <div className="mt-4 space-y-2">
            {features.map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-[#E8EAF0]">
                <CheckCircle size={14} className="text-[#00E5A0] shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#141720] border border-[#2A2F42] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[#E8EAF0] mb-4">Detalles de suscripción</h3>
          <div className="space-y-3">
            {[
              { label: 'Estado', value: <StatusBadge status={client.status} /> },
              { label: 'WhatsApp', value: <StatusBadge status={client.waStatus} /> },
              { label: 'Vencimiento', value: <span className={`text-sm font-medium ${isExpiring ? 'text-[#F59E0B]' : 'text-[#E8EAF0]'}`}>{formatDate(client.expiryDate)}</span> },
              { label: 'Días restantes', value: <span className={`text-lg font-bold ${isExpiring ? 'text-[#F59E0B]' : 'text-[#00E5A0]'}`}>{days}d</span> },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-[#2A2F42] last:border-0">
                <span className="text-sm text-[#6B7280]">{label}</span>
                {value}
              </div>
            ))}
          </div>
          <button className="mt-4 w-full py-2.5 rounded-xl bg-[#7B61FF] text-white text-sm font-semibold hover:bg-[#5B41DF] transition-colors cursor-pointer">
            Solicitar renovación
          </button>
        </div>
      </div>

      <div className="bg-[#141720] border border-[#2A2F42] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2A2F42]">
          <h3 className="text-sm font-semibold text-[#E8EAF0]">Historial de pagos</h3>
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
      </div>
    </div>
  )
}
