'use client'

import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  glow?: 'violet' | 'cyan'
}

export function Card({ children, className = '', glow }: CardProps) {
  const glowClass = glow === 'violet'
    ? 'shadow-[0_0_20px_rgba(108,63,255,0.15)]'
    : glow === 'cyan'
    ? 'shadow-[0_0_20px_rgba(0,229,255,0.1)]'
    : ''

  return (
    <div
      className={`rounded-xl border border-[#1e1e30] bg-[#13131f] p-5 ${glowClass} ${className}`}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: string
  color?: 'violet' | 'cyan' | 'green' | 'yellow'
}

const colorMap = {
  violet: { bg: 'bg-[#6c3fff]/10', text: 'text-[#6c3fff]', value: 'text-[#6c3fff]' },
  cyan:   { bg: 'bg-[#00e5ff]/10', text: 'text-[#00e5ff]', value: 'text-[#00e5ff]' },
  green:  { bg: 'bg-green-500/10',  text: 'text-green-400',  value: 'text-green-400' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', value: 'text-yellow-400' },
}

export function StatCard({ title, value, icon, trend, color = 'violet' }: StatCardProps) {
  const c = colorMap[color]
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#8888aa]">{title}</p>
          <p className={`mt-2 text-3xl font-bold ${c.value}`}>{value}</p>
          {trend && <p className="mt-1 text-xs text-[#8888aa]">{trend}</p>}
        </div>
        <div className={`rounded-lg p-2.5 ${c.bg} ${c.text}`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}
