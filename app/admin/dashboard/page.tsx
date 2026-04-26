'use client'

import { useRouter } from 'next/navigation'
import { Users, UserCheck, MessageSquare, DollarSign, Eye, Wifi, WifiOff } from 'lucide-react'
import { StatCard } from '@/components/ui/Card'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { MessagesChart } from '@/components/charts/MessagesChart'
import { mockAdminStats, mockClients, mockMessageStats } from '@/lib/mock-data'
import type { Client } from '@/types'

export default function AdminDashboard() {
  const router = useRouter()

  const columns = [
    {
      key: 'name',
      header: 'Cliente',
      render: (c: Client) => (
        <div>
          <p className="font-medium text-[#e8e8f0]">{c.name}</p>
          <p className="text-xs text-[#8888aa]">{c.email}</p>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (c: Client) => (
        <span className="text-xs font-medium text-[#6c3fff] bg-[#6c3fff]/10 px-2 py-0.5 rounded-full border border-[#6c3fff]/20">
          {c.plan}
        </span>
      ),
    },
    {
      key: 'whatsapp',
      header: 'WhatsApp',
      render: (c: Client) => <Badge variant={c.whatsappStatus} />,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (c: Client) => <Badge variant={c.status} />,
    },
    {
      key: 'expiry',
      header: 'Vencimiento',
      render: (c: Client) => (
        <span className={`text-sm ${c.status === 'expiring' ? 'text-yellow-400' : 'text-[#8888aa]'}`}>
          {new Date(c.expiryDate).toLocaleDateString('es-PE')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (c: Client) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/admin/clientes/${c.id}`)}
        >
          <Eye size={13} /> Ver
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#e8e8f0]">Dashboard</h2>
        <p className="text-sm text-[#8888aa] mt-0.5">Resumen general de la plataforma</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Clientes"
          value={mockAdminStats.totalClients}
          icon={<Users size={20} />}
          trend="↑ 2 este mes"
          color="violet"
        />
        <StatCard
          title="Clientes Activos"
          value={mockAdminStats.activeClients}
          icon={<UserCheck size={20} />}
          trend={`${Math.round(mockAdminStats.activeClients / mockAdminStats.totalClients * 100)}% del total`}
          color="cyan"
        />
        <StatCard
          title="Mensajes Hoy"
          value={mockAdminStats.messagesToday.toLocaleString()}
          icon={<MessageSquare size={20} />}
          trend="↑ 23% vs ayer"
          color="green"
        />
        <StatCard
          title="Ingresos del Mes"
          value={`S/ ${mockAdminStats.monthlyRevenue.toLocaleString()}`}
          icon={<DollarSign size={20} />}
          trend="↑ 12% vs mes anterior"
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <MessagesChart data={mockMessageStats} title="Mensajes por día (últimos 7 días)" />
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-semibold text-[#e8e8f0]">Estado de bots</h3>
          <div className="space-y-3">
            {mockClients.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-[#1e1e30] last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className={`h-2 w-2 rounded-full ${c.botActive ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-sm text-[#e8e8f0] truncate max-w-[120px]">{c.name}</span>
                </div>
                {c.whatsappStatus === 'connected'
                  ? <Wifi size={14} className="text-green-400 shrink-0" />
                  : <WifiOff size={14} className="text-red-400 shrink-0" />}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#e8e8f0]">Clientes</h3>
          <Button size="sm" onClick={() => router.push('/admin/clientes')}>
            <Users size={13} /> Ver todos
          </Button>
        </div>
        <Table columns={columns} data={mockClients} pageSize={5} />
      </Card>
    </div>
  )
}
