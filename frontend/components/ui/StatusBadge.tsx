'use client'

type StatusType = 'active' | 'inactive' | 'expiring' | 'connected' | 'disconnected' | 'paid' | 'pending'

const cfg: Record<StatusType, { label: string; dot: string; cls: string }> = {
  active:       { label: 'Activo',       dot: 'bg-[#00E5A0]', cls: 'bg-[#00E5A0]/10 text-[#00E5A0] border-[#00E5A0]/25' },
  inactive:     { label: 'Inactivo',     dot: 'bg-[#FF4D6A]', cls: 'bg-[#FF4D6A]/10 text-[#FF4D6A] border-[#FF4D6A]/25' },
  expiring:     { label: 'Por vencer',   dot: 'bg-[#F59E0B]', cls: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25' },
  connected:    { label: 'Conectado',    dot: 'bg-[#00E5A0]', cls: 'bg-[#00E5A0]/10 text-[#00E5A0] border-[#00E5A0]/25' },
  disconnected: { label: 'Desconectado', dot: 'bg-[#FF4D6A]', cls: 'bg-[#FF4D6A]/10 text-[#FF4D6A] border-[#FF4D6A]/25' },
  paid:         { label: 'Pagado',       dot: 'bg-[#00E5A0]', cls: 'bg-[#00E5A0]/10 text-[#00E5A0] border-[#00E5A0]/25' },
  pending:      { label: 'Pendiente',    dot: 'bg-[#F59E0B]', cls: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25' },
}

export function StatusBadge({ status, label }: { status: StatusType; label?: string }) {
  const { dot, cls, label: defaultLabel } = cfg[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {label ?? defaultLabel}
    </span>
  )
}

export function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    'Emprendedor': 'bg-slate-500/15 text-slate-300 border-slate-500/25',
    'Profesional': 'bg-[#7B61FF]/15 text-[#7B61FF] border-[#7B61FF]/25',
    'Básico':      'bg-slate-500/15 text-slate-300 border-slate-500/25',
    'Pro':         'bg-[#7B61FF]/15 text-[#7B61FF] border-[#7B61FF]/25',
    'Enterprise':  'bg-[#00E5A0]/15 text-[#00E5A0] border-[#00E5A0]/25',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[plan] ?? colors['Pro']}`}>
      {plan}
    </span>
  )
}
