'use client'

import { useEffect, useState, useCallback } from 'react'
import { Star, CheckCircle, AlertTriangle, Loader2, MessageCircle, ExternalLink } from 'lucide-react'
import { StatusBadge, PlanBadge } from '@/components/ui/StatusBadge'
import { getSession } from '@/lib/auth'

const BASE_URL    = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8003'
const SOPORTE_WA  = '51924940724'
const SOPORTE_URL = `https://wa.me/${SOPORTE_WA}?text=Hola%2C%20quiero%20renovar%20mi%20plan%20INKABOT`

// ── Configuración de planes ─────────────────────────────────────────────────
const PLAN_CONFIG: Record<string, { price: number; conv_limit: number; features: string[] }> = {
  'Emprendedor': {
    price: 69,
    conv_limit: 200,
    features: [
      'Hasta 200 conversaciones/mes',
      '1 número WhatsApp Business',
      'Agente IA personalizado',
      'Soporte por WhatsApp',
    ],
  },
  'Profesional': {
    price: 189,
    conv_limit: 600,
    features: [
      'Hasta 600 conversaciones/mes',
      '1 número WhatsApp Business',
      'Agente IA personalizado',
      'Soporte prioritario',
      'Estadísticas avanzadas',
    ],
  },
}

// ── Tipos ───────────────────────────────────────────────────────────────────
interface PlanStats {
  plan_name: string | null
  end_date: string | null
  days_remaining: number
  total_conversations_month: number
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  method: string
  plan_name: string
  status: string
  notes: string | null
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Componente principal ────────────────────────────────────────────────────
export default function MiPlanPage() {
  const [planStats,  setPlanStats]  = useState<PlanStats | null>(null)
  const [payments,   setPayments]   = useState<Payment[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  const session  = getSession()
  const tenantId = session?.user.clientId ?? ''
  const token    = session?.token ?? ''
  const headers  = { Authorization: `Bearer ${token}` }

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true); setError(null)
    try {
      const [statsRes, paymentsRes] = await Promise.all([
        fetch(`${BASE_URL}/api/v1/stats/${tenantId}`,   { headers }),
        fetch(`${BASE_URL}/api/v1/payments/${tenantId}`, { headers }),
      ])
      if (!statsRes.ok)    throw new Error(`Stats: HTTP ${statsRes.status}`)
      if (!paymentsRes.ok) throw new Error(`Pagos: HTTP ${paymentsRes.status}`)
      const [statsJson, paymentsJson] = await Promise.all([statsRes.json(), paymentsRes.json()])
      setPlanStats(statsJson.data)
      setPayments(paymentsJson.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos')
    } finally { setLoading(false) }
  }, [tenantId, token])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-[#7B61FF]" />
    </div>
  )
  if (error || !planStats) return (
    <div className="flex items-center justify-center h-64 text-[#FF4D6A] text-sm">
      {error ?? 'No se pudieron cargar los datos del plan'}
    </div>
  )

  const plan         = planStats.plan_name ?? 'Emprendedor'
  const cfg          = PLAN_CONFIG[plan] ?? PLAN_CONFIG['Emprendedor']
  const days         = planStats.days_remaining
  const isExpired    = days === 0 && !!planStats.end_date
  const isExpiring   = days > 0 && days <= 10
  const subStatus    = isExpired ? 'inactive' : 'active'
  const convUsed     = planStats.total_conversations_month
  const convPct      = Math.min(100, Math.round((convUsed / cfg.conv_limit) * 100))
  const convWarning  = convPct >= 80

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EAF0]">Mi Plan</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Detalles de tu suscripción INKABOT</p>
      </div>

      {/* Alerta de vencimiento */}
      {(isExpiring || isExpired) && (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-4 ${isExpired ? 'border-[#FF4D6A]/30 bg-[#FF4D6A]/10' : 'border-[#F59E0B]/30 bg-[#F59E0B]/10'}`}>
          <AlertTriangle size={18} className={`shrink-0 mt-0.5 ${isExpired ? 'text-[#FF4D6A]' : 'text-[#F59E0B]'}`} />
          <div className="flex-1">
            <p className={`text-sm font-semibold ${isExpired ? 'text-[#FF4D6A]' : 'text-[#F59E0B]'}`}>
              {isExpired ? 'Tu plan ha vencido' : `Tu plan vence en ${days} día${days !== 1 ? 's' : ''}`}
            </p>
            <p className={`text-xs mt-1 ${isExpired ? 'text-[#FF4D6A]/80' : 'text-[#F59E0B]/80'}`}>
              Contacta a soporte para renovar y no perder el acceso al bot.
            </p>
            <a href={SOPORTE_URL} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] text-white text-xs font-semibold hover:bg-[#20b857] transition-colors cursor-pointer">
              <MessageCircle size={13} /> Renovar por WhatsApp
              <ExternalLink size={11} className="opacity-70" />
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card plan */}
        <div className="bg-[#141720] border border-[#7B61FF]/30 rounded-2xl p-6 shadow-[0_0_24px_rgba(123,97,255,0.12)]">
          <div className="flex items-center gap-2 mb-5">
            <Star size={16} className="text-[#7B61FF]" />
            <h3 className="text-sm font-semibold text-[#E8EAF0]">Plan actual</h3>
          </div>

          <div className="flex items-end justify-between mb-6">
            <PlanBadge plan={plan} />
            <div className="text-right">
              <p className="text-3xl font-bold text-[#E8EAF0]">S/ {cfg.price}</p>
              <p className="text-xs text-[#6B7280]">por mes</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {cfg.features.map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-[#E8EAF0]">
                <CheckCircle size={14} className="text-[#00E5A0] shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Card suscripción */}
        <div className="bg-[#141720] border border-[#2A2F42] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[#E8EAF0] mb-5">Detalles de suscripción</h3>

          <div className="space-y-4">
            {/* Estado */}
            <div className="flex items-center justify-between py-2.5 border-b border-[#2A2F42]">
              <span className="text-sm text-[#6B7280]">Estado</span>
              <StatusBadge status={subStatus} label={isExpired ? 'Vencido' : 'Activo'} />
            </div>

            {/* Vencimiento */}
            <div className="flex items-center justify-between py-2.5 border-b border-[#2A2F42]">
              <span className="text-sm text-[#6B7280]">Vencimiento</span>
              <span className={`text-sm font-medium ${isExpiring || isExpired ? 'text-[#F59E0B]' : 'text-[#E8EAF0]'}`}>
                {fmtDate(planStats.end_date)}
              </span>
            </div>

            {/* Días restantes */}
            <div className="flex items-center justify-between py-2.5 border-b border-[#2A2F42]">
              <span className="text-sm text-[#6B7280]">Días restantes</span>
              <span className={`text-2xl font-bold ${isExpired ? 'text-[#FF4D6A]' : isExpiring ? 'text-[#F59E0B]' : 'text-[#00E5A0]'}`}>
                {isExpired ? '0' : days}d
              </span>
            </div>

            {/* Uso de conversaciones */}
            <div className="py-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#6B7280]">Conversaciones este mes</span>
                <span className={`text-sm font-semibold ${convWarning ? 'text-[#F59E0B]' : 'text-[#E8EAF0]'}`}>
                  {convUsed} / {cfg.conv_limit}
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#2A2F42] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${convPct >= 100 ? 'bg-[#FF4D6A]' : convWarning ? 'bg-[#F59E0B]' : 'bg-[#7B61FF]'}`}
                  style={{ width: `${convPct}%` }}
                />
              </div>
              <p className="text-xs text-[#6B7280] mt-1.5">{convPct}% utilizado</p>
            </div>
          </div>

          {/* Botón soporte */}
          {!isExpiring && !isExpired && (
            <a href={SOPORTE_URL} target="_blank" rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[#2A2F42] text-[#6B7280] text-sm hover:text-[#E8EAF0] hover:bg-[#1C2030] transition-colors cursor-pointer">
              <MessageCircle size={14} /> Contactar soporte
            </a>
          )}
        </div>
      </div>

      {/* Historial de pagos */}
      <div className="bg-[#141720] border border-[#2A2F42] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2A2F42]">
          <h3 className="text-sm font-semibold text-[#E8EAF0]">Historial de pagos</h3>
        </div>

        {payments.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-[#6B7280]">No hay pagos registrados aún</p>
            <p className="text-xs text-[#6B7280] mt-1">Los pagos aparecerán aquí una vez que el equipo INKABOT los registre</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2F42] bg-[#0D0F14]">
                  {['Fecha', 'Plan', 'Método', 'Monto', 'Estado'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2F42]">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-[#1C2030] transition-colors">
                    <td className="px-5 py-3.5 text-sm text-[#6B7280]">{fmtShort(p.payment_date)}</td>
                    <td className="px-5 py-3.5">
                      <PlanBadge plan={p.plan_name} />
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#E8EAF0]">{p.method}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold text-[#00E5A0]">S/ {p.amount.toFixed(2)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={p.status === 'paid' ? 'active' : 'expiring'} label={p.status === 'paid' ? 'Pagado' : 'Pendiente'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-5 py-3 border-t border-[#2A2F42] bg-[#0D0F14] flex items-center justify-between">
          <p className="text-xs text-[#6B7280]">{payments.length} pago{payments.length !== 1 ? 's' : ''} registrado{payments.length !== 1 ? 's' : ''}</p>
          <a href={SOPORTE_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[#7B61FF] hover:text-[#00E5A0] transition-colors cursor-pointer">
            <MessageCircle size={11} /> +51 924 940 724
          </a>
        </div>
      </div>
    </div>
  )
}
