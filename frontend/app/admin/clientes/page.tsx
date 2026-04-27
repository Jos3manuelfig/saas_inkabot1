'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, Eye, Pencil, Trash2, PowerOff, Power, Filter } from 'lucide-react'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { StatusBadge, PlanBadge } from '@/components/ui/StatusBadge'
import { mockClients, formatDate, daysUntil, type Client, type Plan, type ClientStatus } from '@/lib/mock-data'

const PLANS: Plan[] = ['Emprendedor', 'Profesional', 'Pro', 'Enterprise', 'Básico']

const emptyForm = {
  name: '', email: '', phone: '+51', plan: 'Emprendedor' as Plan,
  expiryDate: '', status: 'active' as ClientStatus,
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#6B7280] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function ClientForm({ value, onChange }: { value: typeof emptyForm; onChange: (v: typeof emptyForm) => void }) {
  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value })
  return (
    <div className="space-y-4">
      <Field label="Nombre del negocio *">
        <input value={value.name} onChange={set('name')} placeholder="Restaurante El Inka" className="w-full px-3 py-2.5 text-sm rounded-xl" />
      </Field>
      <Field label="Email *">
        <input type="email" value={value.email} onChange={set('email')} placeholder="contacto@negocio.pe" className="w-full px-3 py-2.5 text-sm rounded-xl" />
      </Field>
      <Field label="Teléfono WhatsApp">
        <input value={value.phone} onChange={set('phone')} placeholder="+51987654321" className="w-full px-3 py-2.5 text-sm rounded-xl" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Plan">
          <select value={value.plan} onChange={set('plan')} className="w-full px-3 py-2.5 text-sm rounded-xl">
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Estado inicial">
          <select value={value.status} onChange={set('status')} className="w-full px-3 py-2.5 text-sm rounded-xl">
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </Field>
      </div>
      <Field label="Fecha de vencimiento">
        <input type="date" value={value.expiryDate} onChange={set('expiryDate')} className="w-full px-3 py-2.5 text-sm rounded-xl" />
      </Field>
    </div>
  )
}

function ActionBtn({ title, onClick, icon, color = 'default' }: { title: string; onClick: () => void; icon: React.ReactNode; color?: 'default' | 'red' | 'yellow' | 'green' }) {
  const cls = { default: 'hover:text-[#7B61FF] hover:bg-[#7B61FF]/10', red: 'hover:text-[#FF4D6A] hover:bg-[#FF4D6A]/10', yellow: 'hover:text-[#F59E0B] hover:bg-[#F59E0B]/10', green: 'hover:text-[#00E5A0] hover:bg-[#00E5A0]/10' }[color]
  return (
    <button title={title} onClick={onClick} className={`p-1.5 rounded-lg text-[#6B7280] transition-colors cursor-pointer ${cls}`}>{icon}</button>
  )
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>(mockClients)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<Client | null>(null)
  const [form, setForm] = useState(emptyForm)

  const filtered = useMemo(() => clients.filter(c => {
    const q = search.toLowerCase()
    return (!q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      && (!filterPlan || c.plan === filterPlan)
      && (!filterStatus || c.status === filterStatus)
  }), [clients, search, filterPlan, filterStatus])

  function openEdit(c: Client) {
    setForm({ name: c.name, email: c.email, phone: c.phone, plan: c.plan, expiryDate: c.expiryDate, status: c.status })
    setEditClient(c)
  }

  function handleAdd() {
    if (!form.name || !form.email) return
    setClients(prev => [{ id: Date.now().toString(), name: form.name, email: form.email, phone: form.phone, plan: form.plan, status: form.status, waStatus: 'disconnected', expiryDate: form.expiryDate, botActive: false, createdAt: new Date().toISOString().split('T')[0] }, ...prev])
    setAddOpen(false)
  }

  function handleEdit() {
    if (!editClient) return
    setClients(prev => prev.map(c => c.id === editClient.id ? { ...c, ...form } : c))
    setEditClient(null)
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EAF0]">Clientes</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">{clients.length} clientes registrados</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setAddOpen(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#7B61FF] hover:bg-[#5B41DF] text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-[0_0_20px_rgba(123,97,255,0.3)]">
          <Plus size={15} /> Agregar cliente
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..."
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-[#6B7280]" />
          <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} className="px-3 py-2.5 text-sm rounded-xl">
            <option value="">Todos los planes</option>
            {PLANS.map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 text-sm rounded-xl">
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="expiring">Por vencer</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-[#141720] border border-[#2A2F42] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2F42] bg-[#0D0F14]">
                {['Cliente', 'Plan', 'WhatsApp', 'Estado', 'Vencimiento', 'Acciones'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2F42]">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-[#6B7280]">No se encontraron clientes</td></tr>
              ) : filtered.map(c => {
                const days = daysUntil(c.expiryDate)
                const inactive = c.status === 'inactive'
                return (
                  <tr key={c.id} className={`transition-all ${inactive ? 'opacity-50 bg-[#0D0F14]' : 'hover:bg-[#1C2030]'}`}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#E8EAF0]">{c.name}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">{c.email}</p>
                    </td>
                    <td className="px-5 py-4"><PlanBadge plan={c.plan} /></td>
                    <td className="px-5 py-4">
                      <StatusBadge status={c.waStatus} />
                      <p className="text-xs text-[#6B7280] mt-1">{c.phone}</p>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-4">
                      <p className={`text-sm font-medium ${days <= 7 ? 'text-[#FF4D6A]' : days <= 30 ? 'text-[#F59E0B]' : 'text-[#6B7280]'}`}>
                        {formatDate(c.expiryDate)}
                      </p>
                      {days <= 7 && days > 0 && <p className="text-[10px] text-[#FF4D6A] mt-0.5">{days}d restantes</p>}
                      {days <= 0 && <p className="text-[10px] text-[#FF4D6A] mt-0.5">Vencido</p>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <ActionBtn title="Ver" onClick={() => {}} icon={<Eye size={13} />} />
                        <ActionBtn title="Editar" onClick={() => openEdit(c)} icon={<Pencil size={13} />} />
                        <ActionBtn
                          title={inactive ? 'Activar' : 'Desactivar'}
                          onClick={() => setConfirmToggle(c)}
                          icon={inactive ? <Power size={13} /> : <PowerOff size={13} />}
                          color={inactive ? 'green' : 'yellow'}
                        />
                        <ActionBtn title="Eliminar" onClick={() => setConfirmDelete(c)} icon={<Trash2 size={13} />} color="red" />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[#2A2F42] bg-[#0D0F14]">
          <p className="text-xs text-[#6B7280]">Mostrando {filtered.length} de {clients.length} clientes</p>
        </div>
      </div>

      {/* Modales */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Agregar cliente">
        <ClientForm value={form} onChange={setForm} />
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-[#2A2F42]">
          <button onClick={() => setAddOpen(false)} className="px-4 py-2 text-sm rounded-xl border border-[#2A2F42] text-[#6B7280] hover:text-[#E8EAF0] hover:bg-[#1C2030] transition-colors cursor-pointer">Cancelar</button>
          <button onClick={handleAdd} disabled={!form.name || !form.email} className="px-5 py-2 text-sm rounded-xl bg-[#7B61FF] text-white font-semibold hover:bg-[#5B41DF] disabled:opacity-40 transition-colors cursor-pointer">Guardar cliente</button>
        </div>
      </Modal>

      <Modal open={!!editClient} onClose={() => setEditClient(null)} title={`Editar: ${editClient?.name}`}>
        <ClientForm value={form} onChange={setForm} />
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-[#2A2F42]">
          <button onClick={() => setEditClient(null)} className="px-4 py-2 text-sm rounded-xl border border-[#2A2F42] text-[#6B7280] hover:text-[#E8EAF0] hover:bg-[#1C2030] transition-colors cursor-pointer">Cancelar</button>
          <button onClick={handleEdit} className="px-5 py-2 text-sm rounded-xl bg-[#7B61FF] text-white font-semibold hover:bg-[#5B41DF] transition-colors cursor-pointer">Guardar cambios</button>
        </div>
      </Modal>

      <ConfirmModal open={!!confirmDelete} onClose={() => setConfirmDelete(null)}
        onConfirm={() => { setClients(prev => prev.filter(c => c.id !== confirmDelete?.id)); setConfirmDelete(null) }}
        title="Eliminar cliente" danger confirmLabel="Sí, eliminar"
        message={`¿Seguro que quieres eliminar a "${confirmDelete?.name}"? Esta acción no se puede deshacer.`}
      />

      <ConfirmModal open={!!confirmToggle} onClose={() => setConfirmToggle(null)}
        onConfirm={() => { setClients(prev => prev.map(c => c.id === confirmToggle?.id ? { ...c, status: c.status === 'inactive' ? 'active' : 'inactive' } : c)); setConfirmToggle(null) }}
        title={confirmToggle?.status === 'inactive' ? 'Activar cliente' : 'Desactivar cliente'}
        danger={confirmToggle?.status !== 'inactive'}
        confirmLabel={confirmToggle?.status === 'inactive' ? 'Activar' : 'Desactivar'}
        message={`¿Seguro que quieres ${confirmToggle?.status === 'inactive' ? 'activar' : 'desactivar'} a "${confirmToggle?.name}"?`}
      />
    </div>
  )
}
