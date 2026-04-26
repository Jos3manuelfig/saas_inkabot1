'use client'

type BadgeVariant = 'active' | 'inactive' | 'expiring' | 'connected' | 'disconnected' | 'paid' | 'pending'

interface BadgeProps {
  variant: BadgeVariant
  label?: string
}

const config: Record<BadgeVariant, { color: string; dot: string; text: string }> = {
  active:       { color: 'bg-green-500/10 border border-green-500/30 text-green-400',   dot: 'bg-green-400',  text: 'Activo' },
  inactive:     { color: 'bg-red-500/10 border border-red-500/30 text-red-400',         dot: 'bg-red-400',    text: 'Inactivo' },
  expiring:     { color: 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400', dot: 'bg-yellow-400', text: 'Por vencer' },
  connected:    { color: 'bg-green-500/10 border border-green-500/30 text-green-400',   dot: 'bg-green-400',  text: 'Conectado' },
  disconnected: { color: 'bg-red-500/10 border border-red-500/30 text-red-400',         dot: 'bg-red-400',    text: 'Desconectado' },
  paid:         { color: 'bg-green-500/10 border border-green-500/30 text-green-400',   dot: 'bg-green-400',  text: 'Pagado' },
  pending:      { color: 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400', dot: 'bg-yellow-400', text: 'Pendiente' },
}

export function Badge({ variant, label }: BadgeProps) {
  const { color, dot, text } = config[variant]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label ?? text}
    </span>
  )
}
