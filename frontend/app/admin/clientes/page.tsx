'use client'

import { useRouter } from 'next/navigation'
import { Eye, Search } from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { mockClients } from '@/lib/mock-data'
import type { Client } from '@/types'

export default function ClientesPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filtered = mockClients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

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
      key: 'whatsapp',
      header: 'Número WA',
      render: (c: Client) => <span className="text-sm text-[#8888aa]">{c.whatsappNumber}</span>,
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
      key: 'whatsappStatus',
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
        <span className={`text-sm ${c.status === 'expiring' ? 'text-yellow-400 font-medium' : 'text-[#8888aa]'}`}>
          {new Date(c.expiryDate).toLocaleDateString('es-PE')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (c: Client) => (
        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/clientes/${c.id}`)}>
          <Eye size={13} /> Ver detalle
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#e8e8f0]">Clientes</h2>
          <p className="text-sm text-[#8888aa] mt-0.5">{mockClients.length} clientes registrados</p>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8888aa]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full rounded-lg border border-[#1e1e30] bg-[#0f0f1a] pl-8 pr-3 py-2 text-sm text-[#e8e8f0] placeholder:text-[#4a4a6a] focus:border-[#6c3fff] focus:outline-none focus:ring-1 focus:ring-[#6c3fff]"
            />
          </div>
        </div>
        <Table columns={columns} data={filtered} pageSize={8} />
      </Card>
    </div>
  )
}
