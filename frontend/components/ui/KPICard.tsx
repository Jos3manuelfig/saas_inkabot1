'use client'

import { ReactNode } from 'react'

interface KPICardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: string
  trendUp?: boolean
  color?: 'violet' | 'green' | 'yellow' | 'red'
}

const colors = {
  violet: { bg: 'bg-[#7B61FF]/10', icon: 'text-[#7B61FF]', value: 'text-[#7B61FF]', glow: 'shadow-[0_0_20px_rgba(123,97,255,0.12)]' },
  green:  { bg: 'bg-[#00E5A0]/10', icon: 'text-[#00E5A0]', value: 'text-[#00E5A0]', glow: 'shadow-[0_0_20px_rgba(0,229,160,0.10)]' },
  yellow: { bg: 'bg-[#F59E0B]/10', icon: 'text-[#F59E0B]', value: 'text-[#F59E0B]', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.10)]' },
  red:    { bg: 'bg-[#FF4D6A]/10', icon: 'text-[#FF4D6A]', value: 'text-[#FF4D6A]', glow: 'shadow-[0_0_20px_rgba(255,77,106,0.10)]' },
}

export function KPICard({ title, value, icon, trend, trendUp, color = 'violet' }: KPICardProps) {
  const c = colors[color]
  return (
    <div className={`bg-[#141720] border border-[#2A2F42] rounded-2xl p-5 ${c.glow}`}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm text-[#6B7280]">{title}</p>
        <div className={`p-2.5 rounded-xl ${c.bg}`}>
          <span className={c.icon}>{icon}</span>
        </div>
      </div>
      <p className={`text-3xl font-bold tracking-tight ${c.value}`}>{value}</p>
      {trend && (
        <p className={`mt-2 text-xs ${trendUp ? 'text-[#00E5A0]' : 'text-[#6B7280]'}`}>
          {trendUp ? '↑' : '↓'} {trend}
        </p>
      )}
    </div>
  )
}
