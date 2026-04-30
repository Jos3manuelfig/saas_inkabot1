'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Bot, Trash2, ChevronRight } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getSession } from '@/lib/auth'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8003'

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
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const session = getSession()
  const tenantId = session?.user.clientId ?? '1'
  const token = session?.token ?? ''
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  async function fetchAgents() {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/agents/${tenantId}`, { headers })
      if (res.ok) { const json = await res.json(); setAgents(json.data ?? []) }
      else console.error('[vendedores] GET agents', res.status, await res.text())
    } catch (e) {
      console.error('[vendedores] fetch error', e)
    } finally { setLoading(false) }
  }

  async function createAgent() {
    if (!newName.trim()) return
    const agent: Agent = { id: `local_${Date.now()}`, name: newName, description: newDesc || null, is_active: true, is_default: agents.length === 0, created_at: new Date().toISOString(), training_blocks: [] }
    setAgents(prev => [agent, ...prev])
    setCreating(false); setNewName(''); setNewDesc('')
    try { await fetch(`${BASE_URL}/api/v1/agents/${tenantId}`, { method: 'POST', headers, body: JSON.stringify({ name: newName, description: newDesc || null }) }); fetchAgents() } catch {}
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

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EAF0]">Mis Vendedores</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Agentes de IA entrenados con tu información</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#7B61FF] hover:bg-[#5B41DF] text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer">
          <Plus size={15} /> Nuevo vendedor
        </button>
      </div>

      {creating && (
        <div className="bg-[#141720] border border-[#7B61FF]/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(123,97,255,0.1)]">
          <h3 className="text-sm font-semibold text-[#E8EAF0] mb-4">Crear vendedor</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#6B7280] mb-1.5">Nombre *</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Vendedor Ropa..." className="w-full px-3 py-2.5 text-sm rounded-xl" />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1.5">Descripción (opcional)</label>
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="¿Para qué usarás este vendedor?" className="w-full px-3 py-2.5 text-sm rounded-xl" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={createAgent} disabled={!newName.trim()} className="px-4 py-2 text-sm rounded-xl bg-[#7B61FF] text-white font-semibold hover:bg-[#5B41DF] disabled:opacity-40 transition-colors cursor-pointer">Crear</button>
              <button onClick={() => { setCreating(false); setNewName(''); setNewDesc('') }} className="px-4 py-2 text-sm rounded-xl border border-[#2A2F42] text-[#6B7280] hover:text-[#E8EAF0] hover:bg-[#1C2030] transition-colors cursor-pointer">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12 text-[#6B7280] text-sm">Cargando vendedores...</div>
      ) : agents.length === 0 ? (
        <div className="bg-[#141720] border border-[#2A2F42] rounded-2xl p-12 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#7B61FF]/10">
            <Bot size={32} className="text-[#7B61FF]" />
          </div>
          <p className="text-[#E8EAF0] font-semibold">No tienes vendedores creados</p>
          <p className="text-sm text-[#6B7280]">Crea tu primer agente de IA y empieza a entrenarlo</p>
          <button onClick={() => setCreating(true)} className="mt-2 flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-[#7B61FF] text-white font-semibold hover:bg-[#5B41DF] transition-colors cursor-pointer">
            <Plus size={14} /> Crear mi primer vendedor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map(agent => (
            <div key={agent.id} className="bg-[#141720] border border-[#2A2F42] hover:border-[#7B61FF]/40 rounded-2xl p-5 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7B61FF]/15">
                  <Bot size={20} className="text-[#7B61FF]" />
                </div>
                <div className="flex items-center gap-1.5">
                  {agent.is_default && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#00E5A0]/15 text-[#00E5A0] border border-[#00E5A0]/25">
                      WhatsApp
                    </span>
                  )}
                  <StatusBadge status={agent.is_active ? 'active' : 'inactive'} />
                  <button onClick={e => { e.stopPropagation(); deleteAgent(agent.id) }} className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#FF4D6A] hover:bg-[#FF4D6A]/10 transition-colors cursor-pointer">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-[#E8EAF0]">{agent.name}</h3>
              {agent.description && <p className="text-xs text-[#6B7280] mt-1">{agent.description}</p>}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#6B7280]">{agent.training_blocks.length} bloques</span>
                  {!agent.is_default && (
                    <button onClick={e => { e.stopPropagation(); setDefault(agent.id) }}
                      className="text-[10px] text-[#6B7280] hover:text-[#00E5A0] transition-colors cursor-pointer underline underline-offset-2">
                      Usar en WA
                    </button>
                  )}
                </div>
                <button onClick={() => router.push(`/cliente/vendedores/${agent.id}`)} className="flex items-center gap-1 text-xs text-[#7B61FF] hover:text-[#00E5A0] transition-colors cursor-pointer">
                  Abrir <ChevronRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
