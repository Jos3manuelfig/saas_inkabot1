'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Eye, Pencil, Trash2, PowerOff, Power, Filter, Copy, Check, Loader2 } from 'lucide-react'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { StatusBadge, PlanBadge } from '@/components/ui/StatusBadge'
import { api } from '@/lib/api'

type Plan = 'Emprendedor' | 'Profesional'
type WaStatus = 'connected' | 'disconnected' | 'pending'
type ClientStatus = 'active' | 'inactive' | 'expiring'

interface TenantOut {
  id: string
  name: string
  email: string
  phone: string | null
  is_active: boolean
  subscription: { id: string; plan_name: string | null; start_date: string; end_date: string; status: string } | null
  whatsapp_numbers: Array<{ id: string; phone_number: string; status: WaStatus; bot_active: boolean }>
}

interface Client {
  id: string; name: string; email: string; phone: string
  plan: Plan; status: ClientStatus; waStatus: WaStatus
  expiryDate: string; botActive: boolean
}

interface CreatedCredentials { email: string; password: string; tenantName: string }

const PLANS: Plan[] = ['Emprendedor', 'Profesional']
const emptyForm = { name: '', email: '', phone: '+51', plan: 'Emprendedor' as Plan, expiryDate: '', status: 'active' as ClientStatus }

function fmt(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}
function daysUntil(d: string) {
  if (!d) return 9999
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}
function tenantToClient(t: TenantOut): Client {
  const sub = t.subscription
  const wa = t.whatsapp_numbers?.[0]
  let status: ClientStatus = t.is_active ? 'active' : 'inactive'
  if (t.is_active && sub?.status === 'expiring') status = 'expiring'
  return {
    id: t.id, name: t.name, email: t.email, phone: t.phone ?? '',
    plan: (sub?.plan_name as Plan) ?? 'Emprendedor', status,
    waStatus: wa?.status ?? 'disconnected',
    expiryDate: sub?.end_date ?? '', botActive: wa?.bot_active ?? false,
  }
}

const inp = "w-full px-3 py-2.5 text-sm rounded-xl bg-[#0D0F14] border border-[#2A2F42] text-[#E8EAF0] focus:outline-none focus:border-[#7B61FF]"

function ClientForm({ value, onChange }: { value: typeof emptyForm; onChange: (v: typeof emptyForm) => void }) {
  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value })
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Nombre del negocio *</label>
        <input value={value.name} onChange={set('name')} placeholder="Restaurante El Inka" className={inp} />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Email *</label>
        <input type="email" value={value.email} onChange={set('email')} placeholder="contacto@negocio.pe" className={inp} />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Teléfono</label>
        <input value={value.phone} onChange={set('phone')} placeholder="+51987654321" className={inp} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Plan</label>
          <select value={value.plan} onChange={set('plan')} className={inp}>
            {PLANS.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Estado</label>
          <select value={value.status} onChange={set('status')} className={inp}>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Fecha de vencimiento</label>
        <input type="date" value={value.expiryDate} onChange={set('expiryDate')} className={inp} />
      </div>
    </div>
  )
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#00E5A0] hover:bg-[#00E5A0]/10 transition-colors cursor-pointer">
      {copied ? <Check size={14} className="text-[#00E5A0]" /> : <Copy size={14} />}
    </button>
  )
}

function CredentialsModal({ creds, onClose }: { creds: CreatedCredentials; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title="Cliente creado — Credenciales">
      <div className="space-y-4">
        <p className="text-sm text-[#6B7280]">Comparte estas credenciales con tu cliente.</p>
        <div className="bg-[#0D0F14] border border-[#2A2F42] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-[#6B7280] mb-0.5">Email</p><p className="text-sm font-mono text-[#E8EAF0]">{creds.email}</p></div>
            <CopyBtn text={creds.email} />
          </div>
          <div className="border-t border-[#2A2F42]" />
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-[#6B7280] mb-0.5">Contraseña generada</p><p className="text-sm font-mono text-[#7B61FF] font-bold tracking-widest">{creds.password}</p></div>
            <CopyBtn text={creds.password} />
          </div>
        </div>
        <button onClick={() => navigator.clipboard.writeText(`Email: ${creds.email}\nContraseña: ${creds.password}`)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm border border-[#2A2F42] rounded-xl text-[#6B7280] hover:text-[#E8EAF0] hover:bg-[#1C2030] transition-colors cursor-pointer">
          <Copy size={13} /> Copiar todo
        </button>
        <button onClick={onClose} className="w-full px-4 py-2.5 text-sm rounded-xl bg-[#7B61FF] text-white font-semibold hover:bg-[#5B41DF] transition-colors cursor-pointer">
          Entendido
        </button>
      </div>
    </Modal>
  )
}

export default function ClientesPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)   // id del cliente que se está toggling
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null)

  const loadClients = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await api.get<{ data: TenantOut[] }>('/api/v1/tenants/')
      setClients((res.data ?? []).map(tenantToClient))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar clientes')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadClients() }, [loadClients])

  const filtered = useMemo(() => clients.filter(c => {
    const q = search.toLowerCase()
    return (!q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      && (!filterPlan || c.plan === filterPlan)
      && (!filterStatus || c.status === filterStatus)
  }), [clients, search, filterPlan, filterStatus])

  function openEdit(c: Client) {
    setEditForm({ name: c.name, email: c.email, phone: c.phone, plan: c.plan, expiryDate: c.expiryDate, status: c.status })
    setEditClient(c)
  }

  async function handleAdd() {
    if (!form.name || !form.email) return
    setSaving(true); setError(null)
    try {
      const res = await api.post<{ data: { tenant: TenantOut; generated_password: string; client_email: string } }>(
        '/api/v1/tenants/',
        { name: form.name, email: form.email, phone: form.phone || null, plan: form.plan, expiry_date: form.expiryDate || null, status: form.status }
      )
      const { tenant, generated_password, client_email } = res.data
      setClients(prev => [tenantToClient(tenant), ...prev])
      setAddOpen(false); setForm(emptyForm)
      setCredentials({ email: client_email, password: generated_password, tenantName: tenant.name })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear cliente')
    } finally { setSaving(false) }
  }

  async function handleEdit() {
    if (!editClient) return
    setSaving(true); setError(null)
    try {
      await api.put(`/api/v1/tenants/${editClient.id}`, { name: editForm.name, email: editForm.email, phone: editForm.phone || null })
      setClients(prev => prev.map(x => x.id === editClient.id ? { ...x, name: editForm.name, email: editForm.email, phone: editForm.phone } : x))
      setEditClient(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar cliente')
    } finally { setSaving(false) }
  }

  // Toggle directo sin confirm — es reversible, no necesita confirmación
  async function handleToggle(c: Client) {
    setToggling(c.id)
    setError(null)
    const newActive = c.status === 'inactive'   // si está inactivo, lo activamos
    try {
      await api.put(`/api/v1/tenants/${c.id}`, { is_active: newActive })
      setClients(prev => prev.map(x =>
        x.id === c.id ? { ...x, status: newActive ? 'active' : 'inactive' } : x
      ))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cambiar estado')
    } finally { setToggling(null) }
  }

  async function handleDelete(c: Client) {
    try {
      await api.delete(`/api/v1/tenants/${c.id}`)
      setClients(prev => prev.filter(x => x.id !== c.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar cliente')
    }
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EAF0]">Clientes</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">{clients.length} clientes registrados</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setError(null); setAddOpen(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#7B61FF] hover:bg-[#5B41DF] text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-[0_0_20px_rgba(123,97,255,0.3)]">
          <Plus size={15} /> Agregar cliente
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-[#FF4D6A]/10 border border-[#FF4D6A]/30 text-[#FF4D6A] text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-[#FF4D6A]/60 hover:text-[#FF4D6A] cursor-pointer text-xs">✕</button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..."
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-[#141720] border border-[#2A2F42] text-[#E8EAF0] focus:outline-none focus:border-[#7B61FF]" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[#6B7280]" />
          <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-xl bg-[#141720] border border-[#2A2F42] text-[#E8EAF0] focus:outline-none focus:border-[#7B61FF] cursor-pointer">
            <option value="">Todos los planes</option>
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-xl bg-[#141720] border border-[#2A2F42] text-[#E8EAF0] focus:outline-none focus:border-[#7B61FF] cursor-pointer">
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="expiring">Por vencer</option>
          </select>
          {filterStatus && (
            <button onClick={() => setFilterStatus('')} className="text-xs text-[#6B7280] hover:text-[#E8EAF0] cursor-pointer px-2 py-1 rounded-lg hover:bg-[#1C2030] transition-colors">
              Limpiar ✕
            </button>
          )}
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
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center"><Loader2 size={20} className="animate-spin text-[#7B61FF] mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-[#6B7280]">
                  {filterStatus ? `No hay clientes ${filterStatus === 'active' ? 'activos' : filterStatus === 'inactive' ? 'inactivos' : 'por vencer'}` : 'No se encontraron clientes'}
                </td></tr>
              ) : filtered.map(c => {
                const days = daysUntil(c.expiryDate)
                const isInactive = c.status === 'inactive'
                const isToggling = toggling === c.id
                return (
                  <tr key={c.id} className={`transition-all ${isInactive ? 'opacity-60 bg-[#0D0F14]/50' : 'hover:bg-[#1C2030]'}`}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#E8EAF0]">{c.name}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">{c.email}</p>
                    </td>
                    <td className="px-5 py-4"><PlanBadge plan={c.plan} /></td>
                    <td className="px-5 py-4">
                      <StatusBadge status={c.waStatus === 'pending' ? 'inactive' : c.waStatus} label={c.waStatus === 'connected' ? 'Conectado' : c.waStatus === 'pending' ? 'Pendiente' : 'Sin conectar'} />
                      {c.phone && <p className="text-xs text-[#6B7280] mt-1">{c.phone}</p>}
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-4">
                      <p className={`text-sm font-medium ${days <= 7 ? 'text-[#FF4D6A]' : days <= 30 ? 'text-[#F59E0B]' : 'text-[#6B7280]'}`}>
                        {fmt(c.expiryDate)}
                      </p>
                      {days <= 7 && days > 0 && <p className="text-[10px] text-[#FF4D6A] mt-0.5">{days}d restantes</p>}
                      {days <= 0 && c.expiryDate && <p className="text-[10px] text-[#FF4D6A] mt-0.5">Vencido</p>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        {/* Ver / WABA */}
                        <button title="Ver detalle / WABA" onClick={() => router.push(`/admin/clientes/${c.id}`)}
                          className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#7B61FF] hover:bg-[#7B61FF]/10 transition-colors cursor-pointer">
                          <Eye size={13} />
                        </button>
                        {/* Editar */}
                        <button title="Editar" onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#7B61FF] hover:bg-[#7B61FF]/10 transition-colors cursor-pointer">
                          <Pencil size={13} />
                        </button>
                        {/* Activar / Desactivar — directo, sin confirm */}
                        <button
                          title={isInactive ? 'Activar cliente' : 'Desactivar cliente'}
                          onClick={() => handleToggle(c)}
                          disabled={isToggling}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 ${isInactive ? 'text-[#6B7280] hover:text-[#00E5A0] hover:bg-[#00E5A0]/10' : 'text-[#6B7280] hover:text-[#F59E0B] hover:bg-[#F59E0B]/10'}`}
                        >
                          {isToggling
                            ? <Loader2 size={13} className="animate-spin" />
                            : isInactive ? <Power size={13} /> : <PowerOff size={13} />}
                        </button>
                        {/* Eliminar */}
                        <button title="Eliminar" onClick={() => setConfirmDelete(c)}
                          className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#FF4D6A] hover:bg-[#FF4D6A]/10 transition-colors cursor-pointer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[#2A2F42] bg-[#0D0F14] flex items-center justify-between">
          <p className="text-xs text-[#6B7280]">Mostrando {filtered.length} de {clients.length} clientes</p>
          {filterStatus && <p className="text-xs text-[#7B61FF]">Filtro activo: {filterStatus === 'active' ? 'Activos' : filterStatus === 'inactive' ? 'Inactivos' : 'Por vencer'}</p>}
        </div>
      </div>

      {/* Modal: Agregar */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setError(null) }} title="Agregar cliente">
        <ClientForm value={form} onChange={setForm} />
        {error && <p className="mt-3 text-xs text-[#FF4D6A]">{error}</p>}
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-[#2A2F42]">
          <button onClick={() => { setAddOpen(false); setError(null) }} className="px-4 py-2 text-sm rounded-xl border border-[#2A2F42] text-[#6B7280] hover:text-[#E8EAF0] hover:bg-[#1C2030] transition-colors cursor-pointer">Cancelar</button>
          <button onClick={handleAdd} disabled={!form.name || !form.email || saving}
            className="flex items-center gap-2 px-5 py-2 text-sm rounded-xl bg-[#7B61FF] text-white font-semibold hover:bg-[#5B41DF] disabled:opacity-40 transition-colors cursor-pointer">
            {saving && <Loader2 size={13} className="animate-spin" />}
            {saving ? 'Guardando...' : 'Guardar cliente'}
          </button>
        </div>
      </Modal>

      {/* Modal: Editar */}
      <Modal open={!!editClient} onClose={() => { setEditClient(null); setError(null) }} title={`Editar: ${editClient?.name ?? ''}`}>
        <ClientForm value={editForm} onChange={setEditForm} />
        {error && <p className="mt-3 text-xs text-[#FF4D6A]">{error}</p>}
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-[#2A2F42]">
          <button onClick={() => { setEditClient(null); setError(null) }} className="px-4 py-2 text-sm rounded-xl border border-[#2A2F42] text-[#6B7280] hover:text-[#E8EAF0] hover:bg-[#1C2030] transition-colors cursor-pointer">Cancelar</button>
          <button onClick={handleEdit} disabled={!editForm.name || !editForm.email || saving}
            className="flex items-center gap-2 px-5 py-2 text-sm rounded-xl bg-[#7B61FF] text-white font-semibold hover:bg-[#5B41DF] disabled:opacity-40 transition-colors cursor-pointer">
            {saving && <Loader2 size={13} className="animate-spin" />}
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </Modal>

      {/* Modal: Credenciales */}
      {credentials && <CredentialsModal creds={credentials} onClose={() => setCredentials(null)} />}

      {/* Modal: Eliminar (único que necesita confirmación — es irreversible) */}
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) handleDelete(confirmDelete) }}
        title="Eliminar cliente"
        danger
        confirmLabel="Sí, eliminar"
        message={`¿Seguro que quieres eliminar a "${confirmDelete?.name}"? Esta acción no se puede deshacer.`}
      />
    </div>
  )
}
