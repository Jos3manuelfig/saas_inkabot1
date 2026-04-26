'use client'

import { Card, StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { mockPayments, mockClients } from '@/lib/mock-data'
import { DollarSign, TrendingUp, Clock, PlusCircle } from 'lucide-react'
import type { Payment } from '@/types'

export default function PagosPage() {
  const totalRevenue = mockPayments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const pending = mockPayments.filter(p => p.status === 'pending')

  const enriched = mockPayments.map(p => ({
    ...p,
    clientName: mockClients.find(c => c.id === p.clientId)?.name ?? '—',
  }))

  const columns = [
    { key: 'client', header: 'Cliente', render: (p: typeof enriched[0]) => <span className="text-sm font-medium text-[#e8e8f0]">{p.clientName}</span> },
    { key: 'date',   header: 'Fecha',   render: (p: Payment) => <span className="text-sm text-[#8888aa]">{new Date(p.date).toLocaleDateString('es-PE')}</span> },
    { key: 'plan',   header: 'Plan',    render: (p: Payment) => <span className="text-xs font-medium text-[#6c3fff] bg-[#6c3fff]/10 px-2 py-0.5 rounded-full border border-[#6c3fff]/20">{p.plan}</span> },
    { key: 'amount', header: 'Monto',   render: (p: Payment) => <span className="text-sm font-semibold text-[#00e5ff]">S/ {p.amount}</span> },
    { key: 'method', header: 'Método',  render: (p: Payment) => <span className="text-sm text-[#8888aa]">{p.method}</span> },
    { key: 'status', header: 'Estado',  render: (p: Payment) => <Badge variant={p.status} /> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#e8e8f0]">Pagos</h2>
          <p className="text-sm text-[#8888aa] mt-0.5">Historial y gestión de cobros</p>
        </div>
        <Button size="sm"><PlusCircle size={13} /> Registrar pago</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Ingresos totales" value={`S/ ${totalRevenue}`} icon={<DollarSign size={20} />} color="violet" />
        <StatCard title="Este mes" value="S/ 1,248" icon={<TrendingUp size={20} />} color="cyan" />
        <StatCard title="Pagos pendientes" value={pending.length} icon={<Clock size={20} />} color="yellow" />
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-[#e8e8f0] mb-4">Historial de pagos</h3>
        <Table columns={columns} data={enriched} pageSize={8} />
      </Card>
    </div>
  )
}
