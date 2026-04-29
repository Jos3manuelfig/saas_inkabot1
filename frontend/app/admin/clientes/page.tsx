'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
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
  subscription: {
    id: string
    plan_name: string | null
    start_date: string
    end_date: string
    status: string
  } | null
  whatsapp_numbers: Array<{ id: string; phone_number: string; status: WaStatus; bot_active: boolean }>
}

interface Client {
  id: string
  name: string
  email: string
  phone: string
  plan: Plan
  status: ClientStatus
  waStatus: WaStatus
  expiryDate: string
  botActive: boolean
}

interface CreatedCredentials {
  email: string
  password: string
  tenantName: string
}

const PLANS: Plan[] = ['Emprendedor', 'Profesional']

const emptyForm = {
  name: '', email: '', phone: '+51', plan: 'Emprendedor' as Plan,
  expiryDate: '', status: 'active' as ClientStatus,
}

function formatDate(d: string) {
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
  const subStatus = sub?.status ?? 'expired'
  let status: ClientStatus = t.is_active ? 'active' : 'inactive'
  if (t.is_active && subStatus === 'expiring') status = 'expiring'
  return {
    id: t.id,
    name: t.name,
    email: t.email,
    phone: t.phone ?? '',
    plan: (sub?.plan_name as Plan) ?? 'Emprendedor',
    status,
    waStatus: wa?.status ?? 'disconnected',
    expiryDate: sub?.end_date ?? '',
    botActive: wa?.bot_active ?? false,
  }
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
        <input value={value.name} onChange={set('name')} placeholder="Restaurante El Inka"
          className="w-full px-3 py-2.5 text-sm rounded-xl bg-[#0D0F14] border border-[#2A2F42] text-[#E8EAF0] focus:outline-none focus:border-[#7B61FF]" />
      </Field>
      <Field label="Email *">
        <input type="email" value={value.email} onChange={set('email')} placeholder="contacto@negocio.pe"
          className="w-full px-3 py-2.5 text-sm rounded-xl bg-[#0D0F14] border border-[#2A2F42] text-[#E8EAF0] focus:outline-none focus:border-[#7B61FF]" />
      </Field>
      <Field label="Teléfono WhatsApp">
        <input value={value.phone} onChange={set('phone')} placeholder="+51987654321"
          className="w-full px-3 py-2.5 text-sm rounded-xl bg-[#0D0F14] border border-[#2A2F42] text-[#E8EAF0] focus:outline-none focus:border-[#7B61FF]" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Plan">
          <select value={value.plan} onChange={set('plan')}
            className="w-full px-3 py-2.5 text-sm rounded-xl bg-[#0D0F14] border border-[#2A2F42] text-[#E8EAF0] focus:outline-none focus:border-[#7B61FF]">
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Estado inicial">
          <select value={value.status} onChange={set('status')}
            className="w-full px-3 py-2.5 text-sm rounded-xl bg-[#0D0F14] border border-[#2A2F42] text-[#E8EAF0] focus:outline-none focus:border-[#7B61FF]">
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </Field>
      </div>
      <Field label="Fecha de vencimiento">
        <input type="date" value={value.expiryDate} onChange={set('expiryDate')}
          className="w-full px-3 py-2.5 text-sm rounded-xl bg-[#0D0F14] border border-[#2A2F42] text-[#E8EAF0] focus:outline-none focus:border-[#7B61FF]" />
      </Field>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#00E5A0] hover:bg-[#00E5A0]/10 transition-colors cursor-pointer">
      {copied ? <Check size={14} className="text-[#00E5A0]" /> : <Copy size={14} />}
    </button>
  )
}

function CredentialsModal({ creds, onClose }: { creds: CreatedCredentials; onClose: () => void }) {
  const credText = `Cliente: ${creds.tenantName}\nEmail: ${creds.email}\nContraseña: ${creds.password}`
  return (
    <Modal open onClose={onClose} title="✅ Cliente creado — Credenciales">
      <div className="space-y-4">
        <p className="text-sm text-[#6B7280]">Comparte estas credenciales con tu cliente para que pueda acceder al panel.</p>
        <div className="bg-[#0D0F14] border border-[#2A2F42] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#6B7280] mb-0.5">Email</p>
              <p className="text-sm font-mono text-[#E8EAF0]">{creds.email}</p>
            </div>
            <CopyButton text={creds.email} />
          </div>
          <div className="border-t border-[#2A2F42]" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#6B7280] mb-0.5">Contraseña generada</p>
              <p className="text-sm font-mono text-[#7B61FF] font-bold tracking-widest">{creds.password}</p>
            </div>
            <CopyButton text={creds.password} />
          </div>
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(credText) }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm border border-[#2A2F42] rounded-xl text-[#6B7280] hover:text-[#E8EAF0] hover:bg-[#1C2030] transition-colors cursor-pointer"
        >
          <Copy size={13} /> Copiar todo al portapapeles
        </button>
        <button onClick={onClose}
          className="w-full px-4 py-2.5 text-sm rounded-xl bg-[#7B61FF] text-white font-semibold hover:bg-[#5B41DF] transition-colors cursor-pointer">
          Entendido
        </button>
      </div>
    </Modal>
  )
}

function ActionBtn({ title, onClick, icon, color = 'default' }: { title: string; onClick: () => void; icon: React.ReactNode; color?: 'default' | 'red' | 'yellow' | 'green' }) {
  const cls = {
    default: 'hover:text-[#7B61FF] hover:bg-[#7B61FF]/10',
    red: 'hover:text-[#FF4D6A] hover:bg-[#FF4D6A]/10',
    yellow: 'hover:text-[#F59E0B] hover:bg-[#F59E0B]/10',
    green: 'hover:text-[#00E5A0] hover:bg-[#00E5A0]/10',
  }[color]
  return (
    <button title={title} onClick={onClick}
      className={`p-1.5 rounded-lg text-[#6B7280] transition-colors cursor-pointer ${cls}`}>
      {icon}
    </button>
  )
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<Client | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null)

  const loadClients = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<{ data: TenantOut[] }>('/api/v1/tenants/')
      setClients((res.data ?? []).map(tenantToClient))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadClients() }, [loadClients])

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

  async function handleAdd() {
    if (!form.name || !form.email) return
    setSaving(true)
    setError(null)
    try {
      const res = await api.post<{ data: { tenant: TenantOut; generated_password: string; client_email: string } }>(
        '/api/v1/tenants/',
        {
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          plan: form.plan,
          expiry_date: form.expiryDate || null,
          status: form.status,
        }
      )
      const { tenant, generated_password, client_email } = res.data
      setClients(prev => [tenantToClient(tenant), ...prev])
      setAddOpen(false)
      setForm(emptyForm)
      setCredentials({ email: client_email, password: generated_password, tenantName: tenant.name })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear cliente')
    } finally {
      setSaving(false)
    }
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

  async function handleToggle(c: Client) {
    try {
      await api.put(`/api/v1/tenants/${c.id}`, { is_active: c.status === 'inactive' })
      setClients(prev => prev.map(x => x.id === c.id ? { ...x, status: x.status === 'inactive' ? 'active' : 'inactive' } : x))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar estado')
    }
    setConfirmToggle(null)
  }

  return (
    <div className="space-y-5 animate-fadeIn">
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
        <div className="px-4 py-3 rounded-xl bg-[#FF4D6A]/10 border border-[#FF4D6A]/30 text-[#FF4D6A] text-sm">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..."
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-[#141720] border border-[#2A2F42] text-[#E8EAF0] focus:outline-none focus:border-[#7B61FF]" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-[#6B7280]" />
          <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-xl bg-[#141720] border border-[#2A2F42] text-[#E8EAF0]">
            <option value="">Todos los planes</option>
            {PLANS.map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-xl bg-[#141720] border border-[#2A2F42] text-[#E8EAF0]">
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
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Loader2 size={20} className="animate-spin text-[#7B61FF] mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
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
                      <p className="text-xs text-[#6B7280] mt-1">{c.phone || '—'}</p>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-4">
                      <p className={`text-sm font-medium ${days <= 7 ? 'text-[#FF4D6A]' : days <= 30 ? 'text-[#F59E0B]' : 'text-[#6B7280]'}`}>
                        {formatDate(c.expiryDate)}
                      </p>
                      {days <= 7 && days > 0 && <p className="text-[10px] text-[#FF4D6A] mt-0.5">{days}d restantes</p>}
                      {days <= 0 && c.expiryDate && <p className="text-[10px] text-[#FF4D6A] mt-0.5">Vencido</p>}
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

      {/* Modal: Agregar cliente */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Agregar cliente">
        <ClientForm value={form} onChange={setForm} />
        {error && addOpen && (
          <p className="mt-3 text-xs text-[#FF4D6A]">{error}</p>
        )}
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-[#2A2F42]">
          <button onClick={() => setAddOpen(false)}
            className="px-4 py-2 text-sm rounded-xl border border-[#2A2F42] text-[#6B7280] hover:text-[#E8EAF0] hover:bg-[#1C2030] transition-colors cursor-pointer">
            Cancelar
          </button>
          <button onClick={handleAdd} disabled={!form.name || !form.email || saving}
            className="flex items-center gap-2 px-5 py-2 text-sm rounded-xl bg-[#7B61FF] text-white font-semibold hover:bg-[#5B41DF] disabled:opacity-40 transition-colors cursor-pointer">
            {saving && <Loader2 size={13} className="animate-spin" />}
            {saving ? 'Guardando...' : 'Guardar cliente'}
          </button>
        </div>
      </Modal>

      {/* Modal: Credenciales */}
      {credentials && <CredentialsModal creds={credentials} onClose={() => setCredentials(null)} />}

      {/* Modal: Eliminar */}
      <ConfirmModal open={!!confirmDelete} onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Eliminar cliente" danger confirmLabel="Sí, eliminar"
        message={`¿Seguro que quieres eliminar a "${confirmDelete?.name}"? Esta acción no se puede deshacer.`}
      />

      {/* Modal: Activar/Desactivar */}
      <ConfirmModal open={!!confirmToggle} onClose={() => setConfirmToggle(null)}
        onConfirm={() => confirmToggle && handleToggle(confirmToggle)}
        title={confirmToggle?.status === 'inactive' ? 'Activar cliente' : 'Desactivar cliente'}
        danger={confirmToggle?.status !== 'inactive'}
        confirmLabel={confirmToggle?.status === 'inactive' ? 'Activar' : 'Desactivar'}
        message={`¿Seguro que quieres ${confirmToggle?.status === 'inactive' ? 'activar' : 'desactivar'} a "${confirmToggle?.name}"?`}
      />
    </div>
  )
}
