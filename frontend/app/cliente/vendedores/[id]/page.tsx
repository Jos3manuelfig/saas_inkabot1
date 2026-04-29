'use client'

import { use, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Send, Bot, User, Loader2, BookOpen, MessageSquare } from 'lucide-react'
import { getSession } from '@/lib/auth'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8003'

interface TrainingBlock { id: string; content: string; created_at: string }
interface Agent { id: string; name: string; description: string | null; training_blocks: TrainingBlock[] }
interface ChatMessage { role: 'user' | 'assistant'; content: string }

const MOCK_AGENT: Agent = {
  id: 'demo1', name: 'Vendedor Principal', description: 'Agente de ventas general',
  training_blocks: [
    { id: 'b1', content: 'Vendo ropa de mujer. Blusas desde S/30, vestidos desde S/80 y pantalones desde S/50.', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'b2', content: 'Horario: Lunes a Sábado de 9am a 7pm. Ubicados en Av. Larco 123, Miraflores.', created_at: new Date(Date.now() - 86400000).toISOString() },
  ],
}

function Box({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-[#141720] border border-[#2A2F42] rounded-2xl p-5 ${className}`}>{children}</div>
}

export default function VendedorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [tab, setTab] = useState<'train' | 'simulate'>('train')
  const [agent, setAgent] = useState<Agent | null>(null)
  const [newBlock, setNewBlock] = useState('')
  const [saving, setSaving] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [userInput, setUserInput] = useState('')
  const [responding, setResponding] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const session = getSession()
  const tenantId = session?.user.clientId ?? '1'
  const token = session?.token ?? ''
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  async function fetchAgent() {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/agents/${tenantId}/${id}`, { headers })
      if (res.ok) { const json = await res.json(); setAgent(json.data); return }
    } catch {}
    setAgent({ ...MOCK_AGENT, id })
  }

  async function addBlock() {
    if (!newBlock.trim() || !agent) return
    setSaving(true)
    const block: TrainingBlock = { id: `local_${Date.now()}`, content: newBlock, created_at: new Date().toISOString() }
    setAgent(prev => prev ? { ...prev, training_blocks: [...prev.training_blocks, block] } : prev)
    setNewBlock(''); setSaving(false)
    try { await fetch(`${BASE_URL}/api/v1/agents/${tenantId}/${id}/training`, { method: 'POST', headers, body: JSON.stringify({ content: block.content }) }); fetchAgent() } catch {}
  }

  async function deleteBlock(blockId: string) {
    setAgent(prev => prev ? { ...prev, training_blocks: prev.training_blocks.filter(b => b.id !== blockId) } : prev)
    try { await fetch(`${BASE_URL}/api/v1/agents/${tenantId}/${id}/training/${blockId}`, { method: 'DELETE', headers }) } catch {}
  }

  async function sendMessage() {
    if (!userInput.trim() || responding) return
    const message = userInput.trim(); setUserInput('')
    const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: message }]
    setChatHistory(newHistory); setResponding(true)
    try {
      const trainingBlocks = agent?.training_blocks.map(b => b.content) ?? []
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: chatHistory, trainingBlocks }),
      })
      if (res.ok) {
        const json = await res.json()
        setChatHistory([...newHistory, { role: 'assistant', content: json.reply }])
      } else throw new Error()
    } catch {
      setChatHistory([...newHistory, { role: 'assistant', content: 'Error al conectar con el asistente. Intenta de nuevo.' }])
    } finally { setResponding(false) }
  }

  useEffect(() => { fetchAgent() }, [id])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatHistory])

  if (!agent) return <div className="flex items-center justify-center h-64 text-[#6B7280]">Cargando...</div>

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#6B7280] hover:text-[#E8EAF0] hover:bg-[#1C2030] rounded-xl transition-colors cursor-pointer">
          <ArrowLeft size={14} /> Volver
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#E8EAF0]">{agent.name}</h1>
          {agent.description && <p className="text-sm text-[#6B7280]">{agent.description}</p>}
        </div>
      </div>

      <div className="flex gap-1 rounded-xl border border-[#2A2F42] bg-[#0D0F14] p-1 w-fit">
        {([['train', <BookOpen size={14} key="bo" />, 'Entrenar'], ['simulate', <MessageSquare size={14} key="ms" />, 'Simular']] as const).map(([key, icon, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer ${tab === key ? 'bg-[#7B61FF] text-white shadow-[0_0_12px_rgba(123,97,255,0.4)]' : 'text-[#6B7280] hover:text-[#E8EAF0]'}`}>
            {icon} {label}
          </button>
        ))}
      </div>

      {tab === 'train' && (
        <div className="space-y-4">
          <Box>
            <h3 className="text-sm font-semibold text-[#E8EAF0] mb-1">Agregar información de entrenamiento</h3>
            <p className="text-xs text-[#6B7280] mb-3">Escribe cualquier información sobre tu negocio. El agente la usará para responder.</p>
            <textarea value={newBlock} onChange={e => setNewBlock(e.target.value)} rows={4} placeholder="Ej: Vendo ropa de mujer. Mis precios van desde S/30 hasta S/150..."
              className="w-full px-3 py-2.5 text-sm rounded-xl resize-none" />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-[#6B7280]">{newBlock.length} caracteres</span>
              <button onClick={addBlock} disabled={!newBlock.trim() || saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl bg-[#7B61FF] text-white font-semibold hover:bg-[#5B41DF] disabled:opacity-40 transition-colors cursor-pointer">
                {saving ? <><Loader2 size={13} className="animate-spin" />Guardando...</> : <><Plus size={13} />Agregar bloque</>}
              </button>
            </div>
          </Box>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#E8EAF0]">
              Historial de entrenamiento <span className="ml-1 text-xs font-normal text-[#6B7280]">({agent.training_blocks.length} bloques)</span>
            </h3>
            {agent.training_blocks.length === 0 ? (
              <Box><p className="text-center text-sm text-[#6B7280] py-4">Aún no has agregado información. ¡Empieza arriba!</p></Box>
            ) : [...agent.training_blocks].reverse().map((block, i) => (
              <Box key={block.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-[#7B61FF] bg-[#7B61FF]/10 px-2 py-0.5 rounded-full border border-[#7B61FF]/20">
                        Bloque {agent.training_blocks.length - i}
                      </span>
                      <span className="text-xs text-[#6B7280]">
                        {new Date(block.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-sm text-[#E8EAF0] leading-relaxed whitespace-pre-wrap">{block.content}</p>
                  </div>
                  <button onClick={() => deleteBlock(block.id)} className="shrink-0 p-1.5 rounded-lg text-[#6B7280] hover:text-[#FF4D6A] hover:bg-[#FF4D6A]/10 transition-colors cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </Box>
            ))}
          </div>
        </div>
      )}

      {tab === 'simulate' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#6B7280]">{agent.training_blocks.length} bloques de entrenamiento activos. Esta conversación no se guarda.</p>
            <button onClick={() => setChatHistory([])} className="text-xs text-[#6B7280] hover:text-[#E8EAF0] transition-colors cursor-pointer">Limpiar chat ✕</button>
          </div>
          <div className="rounded-2xl overflow-hidden border border-[#2A2F42] shadow-xl">
            <div className="flex items-center gap-3 px-4 py-3 bg-[#075E54]">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366]/20">
                <Bot size={18} className="text-[#25D366]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{agent.name}</p>
                <p className="text-[10px] text-green-300">{responding ? 'escribiendo...' : 'en línea'}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 p-4 overflow-y-auto" style={{ minHeight: '380px', maxHeight: '420px', background: '#0e1621' }}>
              {chatHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2 py-10">
                  <MessageSquare size={24} className="text-[#25D366]" />
                  <p className="text-xs text-[#6B7280]">Envía un mensaje para probar tu agente</p>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#25D366]/20 mr-1.5 mt-1 shrink-0"><Bot size={12} className="text-[#25D366]" /></div>}
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm ${msg.role === 'user' ? 'rounded-tr-sm bg-[#005c4b] text-white' : 'rounded-tl-sm bg-[#1f2c34] text-[#E8EAF0]'}`}>
                    <p className="leading-relaxed">{msg.content}</p>
                    <p className={`mt-1 text-[10px] text-right ${msg.role === 'user' ? 'text-green-300/60' : 'text-[#6B7280]'}`}>
                      {new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {msg.role === 'user' && <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7B61FF]/20 ml-1.5 mt-1 shrink-0"><User size={12} className="text-[#7B61FF]" /></div>}
                </div>
              ))}
              {responding && (
                <div className="flex justify-start">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#25D366]/20 mr-1.5 mt-1"><Bot size={12} className="text-[#25D366]" /></div>
                  <div className="rounded-2xl rounded-tl-sm bg-[#1f2c34] px-4 py-3">
                    <div className="flex gap-1 items-center">
                      {[0, 150, 300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#6B7280] animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="flex items-center gap-2 px-3 py-2.5 bg-[#1f2c34]">
              <input value={userInput} onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Escribe un mensaje..."
                className="flex-1 rounded-full bg-[#2a3942] px-4 py-2 text-sm text-[#E8EAF0] placeholder:text-[#6B7280] border border-[#3a4a52] focus:border-[#25D366]" />
              <button onClick={sendMessage} disabled={!userInput.trim() || responding}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] hover:bg-[#20b857] disabled:opacity-50 transition-colors cursor-pointer shrink-0">
                <Send size={16} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
