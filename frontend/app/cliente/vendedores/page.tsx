'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Bot, Trash2, ChevronRight, Lock } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getSession } from '@/lib/auth'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8003'

const PLAN_LIMITS: Record<string, number> = {
  'Emprendedor': 1,
  'Profesional': 3,
}

interface Agent {
  id: string
  name: string
  description: string | null
  is_active: boolean
  is_default: boolean
  created_at: string
  training_blocks: { id: string }[]
}

export default function VendedoresPage() {
  const router = useRouter()
  const [agents, setAgents]   = useState<Agent[]>([])
  const [planName, setPlanName] = useState<string>('Emprendedor')
  const [loading, setLoading]  = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName]  = useState('')
  const [newDesc, setNewDesc]  = useState('')

  const session  = getSession()
  const tenantId = session?.user.clientId ?? ''
  const token    = session?.token ?? ''
  const headers  = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  async function fetchAgents() {
    try {
      const [agentsRes, statsRes] = await Promise.all([
        fetch(`${BASE_URL}/api/v1/agents/${tenantId}`, { headers, cache: 'no-store' }),
        fetch(`${BASE_URL}/api/v1/stats/${tenantId}`,  { headers, cache: 'no-store' }),
      ])
      if (agentsRes.ok) { const j = await agentsRes.json(); setAgents(j.data ?? []) }
      else console.error('[vendedores] GET agents', agentsRes.status)
      if (statsRes.ok)  { const j = await statsRes.json();  setPlanName(j.data?.plan_name ?? 'Emprendedor') }
    } catch (e) {
      console.error('[vendedores] fetch error', e)
    } finally { setLoading(false) }
  }

  async function createAgent() {
    if (!newName.trim()) return
    setCreating(false); setNewName(''); setNewDesc('')
    try {
      const res = await fetch(`${BASE_URL}/api/v1/agents/${tenantId}`, {
        method: 'POST', headers, body: JSON.stringify({ name: newName, description: newDesc || null }),
      })
      if (res.ok) { fetchAgents() }
      else { console.error('[vendedores] POST agent', res.status, await res.text()) }
    } catch (e) { console.error('[vendedores] create error', e) }
  }

  async function deleteAgent(id: string) {
    setAgents(prev => prev.filter(a => a.id !== id))
    try { await fetch(`${BASE_URL}/api/v1/agents/${tenantId}/${id}`, { method: 'DELETE', headers }) } catch {}
  }

  async function setDefault(id: string) {
    setAgents(prev => prev.map(a => ({ ...a, is_default: a.id === id })))
    try { await fetch(`${BASE_URL}/api/v1/agents/${tenantId}/${id}`, { method: 'PUT', headers, body: JSON.stringify({ is_default: true }) }) } catch {}
  }

  useEffect(() => { fetchAgents() }, [])

  const limit      = PLAN_LIMITS[planName] ?? 1
  const atLimit    = agents.length >= limit
  const isProf     = planName === 'Profesional'

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F2F2F2]">Mis Vendedores</h1>
          <p className="text-sm text-[#8A8A8A] mt-0.5">Agentes de IA entrenados con tu información</p>
        </div>
        {!atLimit ? (
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FF7A1A] hover:bg-[#E0650A] text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer">
            <Plus size={15} /> Nuevo vendedor
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#2A2A2A] text-[#8A8A8A] text-sm">
            <Lock size={14} /> Límite alcanzado
          </div>
        )}
      </div>

      {/* Aviso de límite del plan */}
      {atLimit && (
        <div className="flex items-start gap-3 rounded-xl border border-[#FF7A1A]/30 bg-[#FF7A1A]/8 px-4 py-3">
          <Lock size={15} className="text-[#FF7A1A] shrink-0 mt-0.5" />
          <p className="text-sm text-[#FF7A1A]">
            {isProf
              ? 'Tu plan Profesional incluye hasta 3 vendedores. Has alcanzado el límite.'
              : 'Tu plan Emprendedor incluye 1 vendedor. Actualiza al '}
            {!isProf && (
              <a href="/cliente/plan" className="font-semibold underline underline-offset-2 hover:text-[#00E5A0] transition-colors">
                Plan Profesional
              </a>
            )}
            {!isProf && ' para agregar más.'}
          </p>
        </div>
      )}

      {/* Formulario de creación */}
      {creating && (
        <div className="bg-[#141414] border border-[#FF7A1A]/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(255,122,26,0.1)]">
          <h3 className="text-sm font-semibold text-[#F2F2F2] mb-4">Crear vendedor</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#8A8A8A] mb-1.5">Nombre *</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Vendedor Principal..."
                className="w-full px-3 py-2.5 text-sm rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] text-[#F2F2F2] focus:outline-none focus:border-[#FF7A1A]" />
            </div>
            <div>
              <label className="block text-xs text-[#8A8A8A] mb-1.5">Descripción (opcional)</label>
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="¿Para qué usarás este vendedor?"
                className="w-full px-3 py-2.5 text-sm rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] text-[#F2F2F2] focus:outline-none focus:border-[#FF7A1A]" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={createAgent} disabled={!newName.trim()}
                className="px-4 py-2 text-sm rounded-xl bg-[#FF7A1A] text-white font-semibold hover:bg-[#E0650A] disabled:opacity-40 transition-colors cursor-pointer">
                Crear
              </button>
              <button onClick={() => { setCreating(false); setNewName(''); setNewDesc('') }}
                className="px-4 py-2 text-sm rounded-xl border border-[#2A2A2A] text-[#8A8A8A] hover:text-[#F2F2F2] hover:bg-[#1C1C1C] transition-colors cursor-pointer">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de agentes */}
      {loading ? (
        <div className="flex justify-center py-12 text-[#8A8A8A] text-sm">Cargando vendedores...</div>
      ) : agents.length === 0 ? (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-12 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FF7A1A]/10">
            <Bot size={32} className="text-[#FF7A1A]" />
          </div>
          <p className="text-[#F2F2F2] font-semibold">No tienes vendedores creados</p>
          <p className="text-sm text-[#8A8A8A]">Crea tu primer agente de IA y empieza a entrenarlo</p>
          <button onClick={() => setCreating(true)}
            className="mt-2 flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-[#FF7A1A] text-white font-semibold hover:bg-[#E0650A] transition-colors cursor-pointer">
            <Plus size={14} /> Crear mi primer vendedor
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {agents.map(agent => (
              <div key={agent.id} className="bg-[#141414] border border-[#2A2A2A] hover:border-[#FF7A1A]/40 rounded-2xl p-5 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF7A1A]/15">
                    <Bot size={20} className="text-[#FF7A1A]" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {agent.is_default && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#00E5A0]/15 text-[#00E5A0] border border-[#00E5A0]/25">
                        WhatsApp
                      </span>
                    )}
                    <StatusBadge status={agent.is_active ? 'active' : 'inactive'} />
                    <button onClick={e => { e.stopPropagation(); deleteAgent(agent.id) }}
                      className="p-1.5 rounded-lg text-[#8A8A8A] hover:text-[#FF4D6A] hover:bg-[#FF4D6A]/10 transition-colors cursor-pointer">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-[#F2F2F2]">{agent.name}</h3>
                {agent.description && <p className="text-xs text-[#8A8A8A] mt-1">{agent.description}</p>}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#8A8A8A]">{agent.training_blocks.length} bloques</span>
                    {!agent.is_default && (
                      <button onClick={e => { e.stopPropagation(); setDefault(agent.id) }}
                        className="text-[10px] text-[#8A8A8A] hover:text-[#00E5A0] transition-colors cursor-pointer underline underline-offset-2">
                        Usar en WA
                      </button>
                    )}
                  </div>
                  <button onClick={() => router.push(`/cliente/vendedores/${agent.id}`)}
                    className="flex items-center gap-1 text-xs text-[#FF7A1A] hover:text-[#00E5A0] transition-colors cursor-pointer">
                    Abrir <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* Contador plan */}
          <p className="text-xs text-[#8A8A8A] text-right">
            {agents.length} de {limit} vendedor{limit !== 1 ? 'es' : ''} — Plan {planName}
          </p>
        </>
      )}
    </div>
  )
}
