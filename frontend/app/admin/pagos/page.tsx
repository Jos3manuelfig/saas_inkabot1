'use client'

import { useState, useMemo } from 'react'
import { Plus, DollarSign, TrendingUp, Clock, Filter } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge, PlanBadge } from '@/components/ui/StatusBadge'
import { KPICard } from '@/components/ui/KPICard'
import { mockPayments, mockClients, formatDate, type Payment, type PaymentMethod, type PaymentStatus, type Plan } from '@/lib/mock-data'

const METHODS: PaymentMethod[] = ['Yape', 'Plin', 'Transferencia', 'Tarjeta', 'Efectivo']
const PLANS: Plan[] = ['Emprendedor', 'Profesional', 'Pro', 'Enterprise', 'Básico']

const emptyForm = { clientId: '', amount: '', method: 'Yape' as PaymentMethod, date: new Date().toISOString().split('T')[0], plan: 'Pro' as Plan, status: 'paid' as PaymentStatus }

export default function PagosPage() {
  const [payments, setPayments] = useState<Payment[]>(mockPayments)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [filterMonth, setFilterMonth] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const filtered = useMemo(() => payments.filter(p => {
    const matchMonth = !filterMonth || p.date.startsWith(filterMonth)
    const matchStatus = !filterStatus || p.status === filterStatus
    return matchMonth && matchStatus
  }), [payments, filterMonth, filterStatus])

  const paid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const pending = payments.filter(p => p.status === 'pending')

  function handleAdd() {
    const client = mockClients.find(c => c.id === form.clientId)
    if (!client || !form.amount) return
    const newPayment: Payment = {
      id: Date.now().toString(),
      clientId: form.clientId,
      clientName: client.name,
      amount: Number(form.amount),
      method: form.method,
      date: form.date,
      status: form.status,
      plan: form.plan,
    }
    setPayments(prev => [newPayment, ...prev])
    setAddOpen(false)
    setForm(emptyForm)
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EAF0]">Pagos</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Historial y gestión de cobros</p>
        </div>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#7B61FF] hover:bg-[#5B41DF] text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-[0_0_20px_rgba(123,97,255,0.3)]">
          <Plus size={15} /> Registrar pago
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Ingresos totales" value={`S/ ${paid.toLocaleString()}`} icon={<DollarSign size={20} />} trend="Pagos confirmados" trendUp color="green" />
        <KPICard title="Este mes" value={`S/ ${payments.filter(p => p.date.startsWith('2026-04') && p.status === 'paid').reduce((s, p) => s + p.amount, 0).toLocaleString()}`} icon={<TrendingUp size={20} />} trend="Abril 2026" trendUp color="violet" />
        <KPICard title="Pendientes" value={pending.length} icon={<Clock size={20} />} trend={`S/ ${pending.reduce((s, p) => s + p.amount, 0)} por cobrar`} color="yellow" />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter size={14} className="text-[#6B7280]" />
        <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          className="px-3 py-2.5 text-sm rounded-xl" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 text-sm rounded-xl">
          <option value="">Todos los estados</option>
          <option value="paid">Pagados</option>
          <option value="pending">Pendientes</option>
        </select>
        {(filterMonth || filterStatus) && (
          <button onClick={() => { setFilterMonth(''); setFilterStatus('') }} className="text-xs text-[#6B7280] hover:text-[#E8EAF0] cursor-pointer transition-colors">
            Limpiar filtros ✕
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-[#141720] border border-[#2A2F42] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2F42] bg-[#0D0F14]">
                {['Cliente', 'Monto', 'Plan', 'Método', 'Fecha', 'Estado'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2F42]">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-[#6B7280]">No hay pagos registrados</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-[#1C2030] transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-[#E8EAF0]">{p.clientName}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-base font-bold text-[#00E5A0]">S/ {p.amount.toLocaleString()}</span>
                  </td>
                  <td className="px-5 py-4"><PlanBadge plan={p.plan} /></td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-[#E8EAF0] font-medium">{p.method}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-[#6B7280]">{formatDate(p.date)}</span>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[#2A2F42] bg-[#0D0F14]">
          <p className="text-xs text-[#6B7280]">Mostrando {filtered.length} de {payments.length} pagos</p>
        </div>
      </div>

      {/* Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Registrar pago">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Cliente *</label>
            <select value={form.clientId} onChange={set('clientId')} className="w-full px-3 py-2.5 text-sm rounded-xl">
              <option value="">Seleccionar cliente...</option>
              {mockClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Monto (S/) *</label>
              <input type="number" value={form.amount} onChange={set('amount')} placeholder="150" className="w-full px-3 py-2.5 text-sm rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Método</label>
              <select value={form.method} onChange={set('method')} className="w-full px-3 py-2.5 text-sm rounded-xl">
                {METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Plan</label>
              <select value={form.plan} onChange={set('plan')} className="w-full px-3 py-2.5 text-sm rounded-xl">
                {PLANS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Estado</label>
              <select value={form.status} onChange={set('status')} className="w-full px-3 py-2.5 text-sm rounded-xl">
                <option value="paid">Pagado</option>
                <option value="pending">Pendiente</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Fecha</label>
            <input type="date" value={form.date} onChange={set('date')} className="w-full px-3 py-2.5 text-sm rounded-xl" />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-[#2A2F42]">
          <button onClick={() => setAddOpen(false)} className="px-4 py-2 text-sm rounded-xl border border-[#2A2F42] text-[#6B7280] hover:text-[#E8EAF0] hover:bg-[#1C2030] transition-colors cursor-pointer">Cancelar</button>
          <button onClick={handleAdd} disabled={!form.clientId || !form.amount} className="px-5 py-2 text-sm rounded-xl bg-[#7B61FF] text-white font-semibold hover:bg-[#5B41DF] disabled:opacity-40 transition-colors cursor-pointer">Registrar</button>
        </div>
      </Modal>
    </div>
  )
}
