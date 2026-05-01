'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Phone, MessageSquare, Bot, PlusCircle, CheckCircle,
  Wifi, WifiOff, AlertCircle, Eye, EyeOff, Loader2, Save, RefreshCw,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { KPICard } from '@/components/ui/KPICard'
import { StatusBadge, PlanBadge } from '@/components/ui/StatusBadge'
import { mockPayments, mockMessageStats, formatDate } from '@/lib/mock-data'
import { api } from '@/lib/api'
import { getSession } from '@/lib/auth'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8003'

function Box({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-[#141720] border border-[#2A2F42] rounded-2xl ${className}`}>{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#6B7280] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full px-3 py-2.5 text-sm rounded-xl bg-[#0D0F14] border border-[#2A2F42] text-[#E8EAF0] placeholder:text-[#4B5563] focus:outline-none focus:border-[#7B61FF] transition-colors"

// ── Pestaña WhatsApp ────────────────────────────────────────────────────────

type WaStatus = 'connected' | 'disconnected' | 'pending'

interface WaConfig {
  id?: string
  phone_number: string
  phone_number_id: string
  display_name: string | null
  status: WaStatus
  bot_active: boolean
  access_token_masked?: string
}

interface VerificationResult {
  valid: boolean
  display_name: string | null
  error: string | null
}

function ConnectionIndicator({ status, error, verifying }: { status: WaStatus | 'unconfigured'; error?: string | null; verifying?: boolean }) {
  if (verifying) {
    return (
      <div className="flex items-center gap-3">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="h-14 w-14 rounded-full border-4 border-[#7B61FF]/20 border-t-[#7B61FF] animate-spin" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#F59E0B]">Verificando con Meta...</p>
          <p className="text-xs text-[#6B7280]">Contactando la API de WhatsApp Business</p>
        </div>
      </div>
    )
  }
  if (status === 'connected') {
    return (
      <div className="flex items-center gap-3">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute h-14 w-14 rounded-full bg-[#00E5A0]/15 animate-pulse" />
          <div className="h-10 w-10 rounded-full bg-[#00E5A0] flex items-center justify-center shadow-[0_0_20px_rgba(0,229,160,0.5)]">
            <Wifi size={20} className="text-[#0D0F14]" strokeWidth={2.5} />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#00E5A0]">Conectado a Meta</p>
          <p className="text-xs text-[#6B7280]">Credenciales verificadas correctamente</p>
        </div>
      </div>
    )
  }
  if (status === 'disconnected') {
    return (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-[#FF4D6A] flex items-center justify-center shadow-[0_0_16px_rgba(255,77,106,0.4)]">
          <WifiOff size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#FF4D6A]">Error de credenciales</p>
          <p className="text-xs text-[#6B7280]">{error ?? 'Las credenciales no fueron aceptadas por Meta'}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-[#2A2F42] flex items-center justify-center">
        <AlertCircle size={18} className="text-[#6B7280]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#6B7280]">Sin configurar</p>
        <p className="text-xs text-[#6B7280]">Ingresa las credenciales WABA del cliente</p>
      </div>
    </div>
  )
}

function WhatsAppTab({ tenantId, tenantPhone }: { tenantId: string; tenantPhone: string | null }) {
  const session = getSession()
  const token = session?.token ?? ''
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const [existing, setExisting] = useState<WaConfig | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [form, setForm] = useState({ phone_number: tenantPhone ?? '', phone_number_id: '', access_token: '', display_name: '' })
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ status: WaStatus; verification: VerificationResult } | null>(null)

  const loadConfig = useCallback(async () => {
    setLoadingConfig(true)
    try {
      const res = await fetch(`${BASE_URL}/api/v1/whatsapp/${tenantId}/number`, { headers: authHeaders })
      if (res.ok) {
        const json = await res.json()
        if (json.data) {
          setExisting(json.data)
          setForm(f => ({
            ...f,
            phone_number: json.data.phone_number ?? tenantPhone ?? '',
            phone_number_id: json.data.phone_number_id ?? '',
            display_name: json.data.display_name ?? '',
            access_token: '',
          }))
        }
      }
    } catch (e) {
      console.error('[whatsapp] loadConfig', e)
    } finally {
      setLoadingConfig(false)
    }
  }, [tenantId])

  useEffect(() => { loadConfig() }, [loadConfig])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSave() {
    if (!form.phone_number || !form.phone_number_id || !form.access_token) return
    setSaving(true)
    setResult(null)
    try {
      const res = await fetch(`${BASE_URL}/api/v1/whatsapp/${tenantId}/number`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          phone_number: form.phone_number,
          phone_number_id: form.phone_number_id,
          access_token: form.access_token,
          display_name: form.display_name || null,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setResult({ status: json.data.status, verification: json.data.verification })
        setExisting(json.data)
        // Limpiar token del form por seguridad
        setForm(f => ({ ...f, access_token: '' }))
      } else {
        setResult({ status: 'disconnected', verification: { valid: false, display_name: null, error: json.detail ?? 'Error al guardar' } })
      }
    } catch (e) {
      setResult({ status: 'disconnected', verification: { valid: false, display_name: null, error: 'Error de conexión' } })
    } finally {
      setSaving(false)
    }
  }

  const currentStatus: WaStatus | 'unconfigured' = result?.status ?? existing?.status ?? 'unconfigured'
  const verificationError = result?.verification?.error ?? null

  if (loadingConfig) {
    return <div className="flex justify-center py-12"><Loader2 size={18} className="animate-spin text-[#7B61FF]" /></div>
  }

  return (
    <div className="space-y-5">
      {/* Estado de conexión — círculo verde o rojo */}
      <Box className="p-5">
        <h3 className="text-sm font-semibold text-[#E8EAF0] mb-5">Estado de conexión Meta</h3>
        <ConnectionIndicator status={currentStatus} error={verificationError} verifying={saving} />
        {existing && !saving && (
          <div className="mt-5 pt-4 border-t border-[#2A2F42] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-[#6B7280] mb-0.5">Número</p>
              <p className="text-[#E8EAF0] font-mono">{existing.phone_number}</p>
            </div>
            <div>
              <p className="text-[#6B7280] mb-0.5">Phone Number ID</p>
              <p className="text-[#E8EAF0] font-mono truncate">{existing.phone_number_id}</p>
            </div>
            <div>
              <p className="text-[#6B7280] mb-0.5">Token</p>
              <p className="text-[#E8EAF0] font-mono">{existing.access_token_masked}</p>
            </div>
          </div>
        )}
      </Box>

      {/* Formulario */}
      <Box className="p-5">
        <h3 className="text-sm font-semibold text-[#E8EAF0] mb-1">
          {existing ? 'Actualizar credenciales WABA' : 'Configurar WhatsApp Business'}
        </h3>
        <p className="text-xs text-[#6B7280] mb-5">
          Ingresa los datos de tu cuenta de Meta WhatsApp Business API. El sistema verificará las credenciales automáticamente.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Número de teléfono *">
              <input value={form.phone_number} onChange={set('phone_number')}
                placeholder="+51987654321" className={inputCls} />
            </Field>
            <Field label="Nombre para mostrar">
              <input value={form.display_name} onChange={set('display_name')}
                placeholder="Mi Negocio WhatsApp" className={inputCls} />
            </Field>
          </div>

          <Field label="Phone Number ID *">
            <input value={form.phone_number_id} onChange={set('phone_number_id')}
              placeholder="123456789012345" className={`${inputCls} font-mono`} />
          </Field>

          <Field label={`Access Token *${existing ? ' (deja vacío para mantener el actual)' : ''}`}>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={form.access_token}
                onChange={set('access_token')}
                placeholder={existing ? '••••••••••••••••••••' : 'EAAxxxxxxxxxxxxxx...'}
                className={`${inputCls} pr-10 font-mono`}
              />
              <button
                type="button"
                onClick={() => setShowToken(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#E8EAF0] transition-colors cursor-pointer"
              >
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.phone_number || !form.phone_number_id || (!form.access_token && !existing)}
              className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl bg-[#7B61FF] text-white font-semibold hover:bg-[#5B41DF] disabled:opacity-40 transition-colors cursor-pointer"
            >
              {saving
                ? <><Loader2 size={14} className="animate-spin" /> Verificando con Meta...</>
                : <><Save size={14} /> Guardar y verificar</>}
            </button>
            {existing && (
              <button onClick={loadConfig} className="flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-xl border border-[#2A2F42] text-[#6B7280] hover:text-[#E8EAF0] hover:bg-[#1C2030] transition-colors cursor-pointer">
                <RefreshCw size={13} /> Recargar
              </button>
            )}
          </div>

          <div className="mt-2 px-4 py-3 rounded-xl bg-[#0D0F14] border border-[#2A2F42] text-xs text-[#6B7280] space-y-1">
            <p className="font-medium text-[#E8EAF0]">¿Dónde obtengo estos datos?</p>
            <p>1. Entra a <span className="text-[#7B61FF]">business.facebook.com</span> → WhatsApp Manager</p>
            <p>2. Selecciona tu número → Panel de control → API Setup</p>
            <p>3. Copia el <span className="text-[#E8EAF0]">Phone Number ID</span> y genera un <span className="text-[#E8EAF0]">Access Token permanente</span></p>
          </div>
        </div>
      </Box>
    </div>
  )
}

// ── Página principal con pestañas ───────────────────────────────────────────

type Tab = 'info' | 'whatsapp' | 'pagos'

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('info')
  const [tenant, setTenant] = useState<{ id: string; name: string; email: string; phone: string | null; is_active: boolean; subscription: { plan_name: string | null; end_date: string; status: string } | null } | null>(null)

  const session = getSession()
  const token = session?.token ?? ''

  useEffect(() => {
    fetch(`${BASE_URL}/api/v1/tenants/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(j => setTenant(j.data))
      .catch(() => {})
  }, [id])

  const payments = mockPayments.filter(p => p.clientId === id)
  const totalSent = mockMessageStats.reduce((s, d) => s + d.sent, 0)
  const totalReceived = mockMessageStats.reduce((s, d) => s + d.received, 0)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info',      label: 'Información' },
    { key: 'whatsapp',  label: 'WABA' },
    { key: 'pagos',     label: 'Pagos' },
  ]

  const name = tenant?.name ?? '...'
  const email = tenant?.email ?? ''
  const plan = tenant?.subscription?.plan_name ?? '—'
  const endDate = tenant?.subscription?.end_date ?? ''
  const days = endDate ? Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000) : 0

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#6B7280] hover:text-[#E8EAF0] hover:bg-[#1C2030] rounded-xl transition-colors cursor-pointer">
          <ArrowLeft size={14} /> Volver
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#E8EAF0]">{name}</h1>
          <p className="text-sm text-[#6B7280]">{email}</p>
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex gap-1 rounded-xl border border-[#2A2F42] bg-[#0D0F14] p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              tab === t.key
                ? 'bg-[#7B61FF] text-white shadow-[0_0_12px_rgba(123,97,255,0.35)]'
                : 'text-[#6B7280] hover:text-[#E8EAF0]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Pestaña: Información */}
      {tab === 'info' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Box className="p-5">
              <h3 className="text-sm font-semibold text-[#E8EAF0] mb-4">Datos del cliente</h3>
              <div className="space-y-3">
                {[
                  { label: 'Plan',     value: <PlanBadge plan={plan as never} /> },
                  { label: 'Estado',   value: <StatusBadge status={tenant?.is_active ? 'active' : 'inactive'} /> },
                  { label: 'Teléfono', value: <div className="flex items-center gap-1 text-xs text-[#E8EAF0]"><Phone size={11} />{tenant?.phone ?? '—'}</div> },
                  { label: 'Vence',    value: <span className={`text-xs font-medium ${days <= 7 ? 'text-[#FF4D6A]' : 'text-[#6B7280]'}`}>{endDate ? formatDate(endDate) : '—'}</span> },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-[#2A2F42] last:border-0">
                    <span className="text-xs text-[#6B7280]">{label}</span>
                    {value}
                  </div>
                ))}
              </div>
            </Box>

            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 content-start">
              <KPICard title="Msgs enviados"  value={totalSent}     icon={<MessageSquare size={18} />} color="violet" />
              <KPICard title="Msgs recibidos" value={totalReceived} icon={<MessageSquare size={18} />} color="green" />
              <KPICard title="Leads cerrados" value={5}             icon={<CheckCircle   size={18} />} color="yellow" />
            </div>
          </div>

          <Box className="p-5">
            <h3 className="text-sm font-semibold text-[#E8EAF0] mb-4">Mensajes (últimos 7 días)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={mockMessageStats} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="adV" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7B61FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7B61FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2F42" />
                <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1C2030', border: '1px solid #2A2F42', borderRadius: 10, color: '#E8EAF0', fontSize: 12 }} />
                <Area type="monotone" dataKey="sent" stroke="#7B61FF" strokeWidth={2} fill="url(#adV)" name="Enviados" />
                <Area type="monotone" dataKey="received" stroke="#00E5A0" strokeWidth={2} fill="none" name="Recibidos" />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </div>
      )}

      {/* Pestaña: WABA */}
      {tab === 'whatsapp' && <WhatsAppTab tenantId={id} tenantPhone={tenant?.phone ?? null} />}

      {/* Pestaña: Pagos */}
      {tab === 'pagos' && (
        <Box className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2F42]">
            <h3 className="text-sm font-semibold text-[#E8EAF0]">Historial de pagos</h3>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl bg-[#7B61FF] text-white hover:bg-[#5B41DF] transition-colors cursor-pointer">
              <PlusCircle size={13} /> Registrar pago
            </button>
          </div>
          {payments.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[#6B7280]">No hay pagos registrados para este cliente</p>
          ) : (
            <div className="divide-y divide-[#2A2F42]">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#1C2030] transition-colors">
                  <div>
                    <p className="text-sm font-medium text-[#E8EAF0]">{p.plan}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">{formatDate(p.date)} · {p.method}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#00E5A0]">S/ {p.amount}</span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Box>
      )}
    </div>
  )
}
