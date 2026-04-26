'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import type { MessageStat } from '@/types'

interface MessagesChartProps {
  data: MessageStat[]
  title?: string
}

export function MessagesChart({ data, title = 'Mensajes por día' }: MessagesChartProps) {
  return (
    <div>
      {title && <h3 className="mb-4 text-sm font-semibold text-[#e8e8f0]">{title}</h3>}
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradViolet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6c3fff" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6c3fff" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e30" />
          <XAxis dataKey="date" tick={{ fill: '#8888aa', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#8888aa', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#13131f', border: '1px solid #1e1e30', borderRadius: '8px', color: '#e8e8f0' }}
            labelStyle={{ color: '#8888aa', fontSize: 11 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: '#8888aa' }}
            formatter={(value) => value === 'sent' ? 'Enviados' : 'Recibidos'}
          />
          <Area type="monotone" dataKey="sent" stroke="#6c3fff" strokeWidth={2} fill="url(#gradViolet)" name="sent" />
          <Area type="monotone" dataKey="received" stroke="#00e5ff" strokeWidth={2} fill="url(#gradCyan)" name="received" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
