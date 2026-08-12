'use client'

import { use, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Trash2, Send, Bot, User, Loader2, BookOpen, MessageSquare,
  Check, Pencil, X, Smile, Smartphone, CreditCard, Truck, CheckCircle2,
} from 'lucide-react'
import { getSession } from '@/lib/auth'
import { Modal } from '@/components/ui/Modal'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8003'

interface TrainingBlock { id: string; content: string; created_at: string }
interface Agent {
  id: string
  name: string
  description: string | null
  training_blocks: TrainingBlock[]
  gender: string | null
  tone: string | null
  formality: string | null
  payment_info: string | null
  shipping_info: string | null
}
interface ChatMessage { role: 'user' | 'assistant'; content: string }
interface WhatsappNumberInfo { id: string; phone_number: string; display_name: string | null; status: string; bot_active: boolean }

const MOCK_AGENT: Agent = {
  id: 'demo1', name: 'Vendedor Principal', description: 'Agente de ventas general',
  gender: null, tone: null, formality: null, payment_info: null, shipping_info: null,
  training_blocks: [
    { id: 'b1', content: 'Vendo ropa de mujer. Blusas desde S/30, vestidos desde S/80 y pantalones desde S/50.', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'b2', content: 'Horario: Lunes a Sábado de 9am a 7pm. Ubicados en Av. Larco 123, Miraflores.', created_at: new Date(Date.now() - 86400000).toISOString() },
  ],
}

const GENDERS = ['Femenino', 'Masculino', 'Neutro'] as const
const TONES = ['Neutral', 'Amigable', 'Profesional', 'Directo', 'Motivador'] as const
const FORMALITIES = ['Formal', 'Casual'] as const

const STEPS = [
  { key: 'personalidad', label: 'Personalidad', icon: Smile },
  { key: 'conocimiento', label: 'Base de conocimiento', icon: BookOpen },
  { key: 'canales', label: 'Canales', icon: Smartphone },
  { key: 'pagos', label: 'Pagos', icon: CreditCard },
  { key: 'envios', label: 'Envíos', icon: Truck },
] as const
type StepKey = (typeof STEPS)[number]['key']

function Box({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 ${className}`}>{children}</div>
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
        active
          ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
          : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
      }`}
    >
      {children}
    </button>
  )
}

export default function VendedorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [step, setStep] = useState<StepKey>('personalidad')
  const [agent, setAgent] = useState<Agent | null>(null)
  const [simulatorOpen, setSimulatorOpen] = useState(false)

  // Entrenar (base de conocimiento) — sin cambios de lógica, solo re-skin
  const [newBlock, setNewBlock] = useState('')
  const [savingBlock, setSavingBlock] = useState(false)
  const [savedBlock, setSavedBlock] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Personalidad / Pagos / Envíos
  const [agentName, setAgentName] = useState('')
  const [gender, setGender] = useState('')
  const [tone, setTone] = useState('')
  const [formality, setFormality] = useState('')
  const [paymentInfo, setPaymentInfo] = useState('')
  const [shippingInfo, setShippingInfo] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  // Canales
  const [whatsappNumbers, setWhatsappNumbers] = useState<WhatsappNumberInfo[] | null>(null)

  // Simulador
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [userInput, setUserInput] = useState('')
  const [responding, setResponding] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const lastSentRef = useRef<number>(0)

  const RATE_LIMIT_MS = 3000
  const MAX_DAILY_MSGS = 10
  const SIM_STORAGE_KEY = 'inkabot_sim'

  function getSimUsage(): { count: number; date: string } {
    try {
      const raw = localStorage.getItem(SIM_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        const today = new Date().toISOString().slice(0, 10)
        if (parsed.date === today) return parsed
      }
    } catch {}
    return { count: 0, date: new Date().toISOString().slice(0, 10) }
  }

  function incrementSimUsage(): number {
    const usage = getSimUsage()
    usage.count += 1
    try { localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(usage)) } catch {}
    return usage.count
  }

  const session = getSession()
  const tenantId = session?.user.clientId ?? '1'
  const token = session?.token ?? ''
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  function hydrateFormFromAgent(a: Agent) {
    setAgentName(a.name)
    setGender(a.gender ?? '')
    setTone(a.tone ?? '')
    setFormality(a.formality ?? '')
    setPaymentInfo(a.payment_info ?? '')
    setShippingInfo(a.shipping_info ?? '')
  }

  async function fetchAgent(preserveOnError = false) {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/agents/${tenantId}/${id}`, { headers, cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        setAgent(json.data)
        hydrateFormFromAgent(json.data)
        return
      }
      console.error('[agent] GET', res.status, await res.text().catch(() => ''))
    } catch (e) {
      console.error('[agent] fetch error', e)
    }
    if (!preserveOnError && id === 'demo1') {
      setAgent(prev => {
        const next = prev ?? { ...MOCK_AGENT, id }
        hydrateFormFromAgent(next)
        return next
      })
    }
  }

  async function fetchWhatsappStatus() {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/whatsapp/${tenantId}/status`, { headers, cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        setWhatsappNumbers(json.data ?? [])
        return
      }
    } catch (e) {
      console.error('[whatsapp] fetch error', e)
    }
    setWhatsappNumbers([])
  }

  async function saveProfile() {
    if (!agent) return
    setProfileSaving(true)
    try {
      const res = await fetch(`${BASE_URL}/api/v1/agents/${tenantId}/${id}`, {
        method: 'PUT', headers,
        body: JSON.stringify({
          name: agentName, gender: gender || null, tone: tone || null, formality: formality || null,
          payment_info: paymentInfo || null, shipping_info: shippingInfo || null,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setAgent(json.data)
        setProfileSaved(true)
        setTimeout(() => setProfileSaved(false), 2000)
      } else {
        console.error('[agent] PUT failed', res.status, await res.text().catch(() => ''))
      }
    } catch (e) {
      console.error('[agent] update error', e)
    } finally {
      setProfileSaving(false)
    }
  }

  async function addBlock() {
    if (!newBlock.trim() || !agent) return
    setSavingBlock(true)
    const tempId = `local_${Date.now()}`
    const block: TrainingBlock = { id: tempId, content: newBlock, created_at: new Date().toISOString() }
    setAgent(prev => prev ? { ...prev, training_blocks: [...prev.training_blocks, block] } : prev)
    setNewBlock('')

    let success = false
    try {
      const res = await fetch(`${BASE_URL}/api/v1/agents/${tenantId}/${id}/training`, {
        method: 'POST', headers, body: JSON.stringify({ content: block.content }),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.data?.id) {
          setAgent(prev => prev ? {
            ...prev,
            training_blocks: prev.training_blocks.map(b => b.id === tempId ? { ...b, id: json.data.id } : b),
          } : prev)
        }
        success = true
      } else {
        console.error('[training] POST failed', res.status, await res.text().catch(() => ''))
        setAgent(prev => prev ? { ...prev, training_blocks: prev.training_blocks.filter(b => b.id !== tempId) } : prev)
      }
    } catch (e) {
      console.error('[training] fetch error', e)
      setAgent(prev => prev ? { ...prev, training_blocks: prev.training_blocks.filter(b => b.id !== tempId) } : prev)
    }

    setSavingBlock(false)
    if (success) {
      setSavedBlock(true)
      setTimeout(() => setSavedBlock(false), 2000)
    }
  }

  function startEdit(block: TrainingBlock) {
    setEditingId(block.id)
    setEditContent(block.content)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditContent('')
  }

  async function saveEdit(blockId: string) {
    if (!editContent.trim()) return
    setEditSaving(true)
    try {
      const res = await fetch(`${BASE_URL}/api/v1/agents/${tenantId}/${id}/training/${blockId}`, {
        method: 'PUT', headers, body: JSON.stringify({ content: editContent.trim() }),
      })
      if (res.ok) {
        setAgent(prev => prev ? {
          ...prev,
          training_blocks: prev.training_blocks.map(b => b.id === blockId ? { ...b, content: editContent.trim() } : b),
        } : prev)
        setEditingId(null)
        setEditContent('')
      } else {
        console.error('[training] PUT failed', res.status)
      }
    } catch (e) {
      console.error('[training] update error', e)
    } finally {
      setEditSaving(false)
    }
  }

  async function deleteBlock(blockId: string) {
    setAgent(prev => prev ? { ...prev, training_blocks: prev.training_blocks.filter(b => b.id !== blockId) } : prev)
    try { await fetch(`${BASE_URL}/api/v1/agents/${tenantId}/${id}/training/${blockId}`, { method: 'DELETE', headers }) } catch {}
  }

  async function sendMessage() {
    if (!userInput.trim() || responding) return

    const now = Date.now()
    if (now - lastSentRef.current < RATE_LIMIT_MS) {
      const secs = Math.ceil((RATE_LIMIT_MS - (now - lastSentRef.current)) / 1000)
      setChatHistory(h => [...h, { role: 'assistant', content: `⏳ Espera ${secs} segundo(s) antes de enviar otro mensaje.` }])
      return
    }

    const usage = getSimUsage()
    if (usage.count >= MAX_DAILY_MSGS) {
      setChatHistory(h => [...h, { role: 'assistant', content: `🚫 Alcanzaste el límite de ${MAX_DAILY_MSGS} mensajes de prueba por día. Vuelve mañana o usa el bot real desde WhatsApp.` }])
      return
    }

    lastSentRef.current = now
    incrementSimUsage()

    const message = userInput.trim(); setUserInput('')
    const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: message }]
    setChatHistory(newHistory); setResponding(true)
    try {
      const trainingBlocks = agent?.training_blocks.map(b => b.content) ?? []
      const personalityBits = [
        gender && `género ${gender.toLowerCase()}`,
        tone && `tono ${tone.toLowerCase()}`,
        formality && `trato ${formality.toLowerCase()}`,
      ].filter(Boolean)
      const agentPromptParts = [
        personalityBits.length ? `Te llamas ${agentName}. Tu personalidad: ${personalityBits.join(', ')}.` : '',
        paymentInfo ? `MÉTODOS DE PAGO ACEPTADOS:\n${paymentInfo}` : '',
        shippingInfo ? `ENVÍOS:\n${shippingInfo}` : '',
      ].filter(Boolean)

      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: chatHistory, trainingBlocks, agentPrompt: agentPromptParts.join('\n\n') }),
      })
      const json = await res.json()
      if (res.ok && json.reply) {
        setChatHistory([...newHistory, { role: 'assistant', content: json.reply }])
      } else {
        const errMsg = json.error ?? 'Error al generar respuesta'
        console.error('[simulate]', res.status, errMsg)
        setChatHistory([...newHistory, { role: 'assistant', content: `⚠️ ${errMsg}` }])
      }
    } catch (e) {
      console.error('[simulate] fetch error', e)
      setChatHistory([...newHistory, { role: 'assistant', content: '⚠️ Error de conexión con el simulador. Intenta de nuevo.' }])
    } finally { setResponding(false) }
  }

  useEffect(() => { fetchAgent(false) }, [id])
  useEffect(() => { if (step === 'canales' && whatsappNumbers === null) fetchWhatsappStatus() }, [step])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatHistory])

  if (!agent) return <div className="flex items-center justify-center h-64 text-[var(--muted)]">Cargando...</div>

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] rounded-xl transition-colors cursor-pointer">
            <ArrowLeft size={14} /> Volver
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text)]">{agent.name}</h1>
            {agent.description && <p className="text-sm text-[var(--muted)]">{agent.description}</p>}
          </div>
        </div>
        <button
          onClick={() => setSimulatorOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)]/50 hover:text-[var(--primary)] transition-colors cursor-pointer"
        >
          <MessageSquare size={14} /> Simular
        </button>
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-5">
        {/* Rail de pasos */}
        <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
          {STEPS.map(({ key, label, icon: Icon }) => {
            const active = step === key
            return (
              <button
                key={key}
                onClick={() => setStep(key)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] border border-transparent'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            )
          })}
        </div>

        {/* Contenido del paso */}
        <div className="space-y-4 min-w-0">
          {step === 'personalidad' && (
            <Box className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)] mb-1">Personalidad del vendedor</h3>
                <p className="text-xs text-[var(--muted)] mb-4">Define cómo se presenta y cómo habla tu agente con tus clientes.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Nombre del agente</label>
                <input
                  value={agentName}
                  onChange={e => setAgentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Género</label>
                <div className="flex flex-wrap gap-2">
                  {GENDERS.map(g => <Pill key={g} active={gender === g} onClick={() => setGender(g)}>{g}</Pill>)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Trato al cliente</label>
                <div className="flex flex-wrap gap-2">
                  {FORMALITIES.map(f => <Pill key={f} active={formality === f} onClick={() => setFormality(f)}>{f}</Pill>)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Tono de comunicación</label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map(t => <Pill key={t} active={tone === t} onClick={() => setTone(t)}>{t}</Pill>)}
                </div>
              </div>

              <SaveBar saving={profileSaving} saved={profileSaved} onSave={saveProfile} />
            </Box>
          )}

          {step === 'conocimiento' && (
            <div className="space-y-4">
              <Box>
                <h3 className="text-sm font-semibold text-[var(--text)] mb-1">Agregar información de entrenamiento</h3>
                <p className="text-xs text-[var(--muted)] mb-3">Escribe cualquier información sobre tu negocio. El agente la usará para responder.</p>
                <textarea value={newBlock} onChange={e => setNewBlock(e.target.value)} rows={4} placeholder="Ej: Vendo ropa de mujer. Mis precios van desde S/30 hasta S/150..."
                  className="w-full px-3 py-2.5 text-sm rounded-xl resize-none bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--primary)]" />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-[var(--muted)]">{newBlock.length} caracteres</span>
                  <button onClick={addBlock} disabled={!newBlock.trim() || savingBlock}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl font-semibold transition-all cursor-pointer disabled:opacity-40 ${savedBlock ? 'bg-[#00E5A0] text-[var(--bg)]' : 'bg-[var(--primary)] hover:bg-[var(--primary-dim)] text-white'}`}>
                    {savingBlock ? <><Loader2 size={13} className="animate-spin" />Guardando...</>
                      : savedBlock ? <><Check size={13} />Guardado</>
                      : <><Plus size={13} />Agregar bloque</>}
                  </button>
                </div>
              </Box>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--text)]">
                  Historial de entrenamiento <span className="ml-1 text-xs font-normal text-[var(--muted)]">({agent.training_blocks.length} bloques)</span>
                </h3>
                {agent.training_blocks.length === 0 ? (
                  <Box><p className="text-center text-sm text-[var(--muted)] py-4">Aún no has agregado información. ¡Empieza arriba!</p></Box>
                ) : [...agent.training_blocks].reverse().map((block, i) => (
                  <Box key={block.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-full border border-[var(--primary)]/20">
                            Bloque {agent.training_blocks.length - i}
                          </span>
                          <span className="text-xs text-[var(--muted)]">
                            {new Date(block.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                        {editingId === block.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editContent}
                              onChange={e => setEditContent(e.target.value)}
                              rows={4}
                              className="w-full px-3 py-2.5 text-sm rounded-xl resize-none bg-[var(--bg)] border border-[var(--primary)]/50 text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                              autoFocus
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => saveEdit(block.id)}
                                disabled={editSaving || !editContent.trim()}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-dim)] text-white font-semibold disabled:opacity-40 transition-colors cursor-pointer"
                              >
                                {editSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                                Guardar
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] transition-colors cursor-pointer"
                              >
                                <X size={11} /> Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap">{block.content}</p>
                        )}
                      </div>

                      {editingId !== block.id && (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => startEdit(block)} className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors cursor-pointer" title="Editar bloque">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => deleteBlock(block.id)} className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[#FF4D6A] hover:bg-[#FF4D6A]/10 transition-colors cursor-pointer" title="Eliminar bloque">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </Box>
                ))}
              </div>
            </div>
          )}

          {step === 'canales' && (
            <Box>
              <h3 className="text-sm font-semibold text-[var(--text)] mb-1">Canales conectados</h3>
              <p className="text-xs text-[var(--muted)] mb-4">Estado de tus números de WhatsApp Business.</p>
              {whatsappNumbers === null ? (
                <div className="flex items-center gap-2 text-sm text-[var(--muted)] py-6 justify-center">
                  <Loader2 size={16} className="animate-spin" /> Cargando estado...
                </div>
              ) : whatsappNumbers.length === 0 ? (
                <p className="text-center text-sm text-[var(--muted)] py-6">Aún no tienes un número de WhatsApp conectado. Contáctanos para activarlo.</p>
              ) : (
                <div className="space-y-3">
                  {whatsappNumbers.map(n => (
                    <div key={n.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)]/15">
                          <Smartphone size={16} className="text-[var(--primary)]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text)]">{n.display_name || n.phone_number}</p>
                          <p className="text-xs text-[var(--muted)]">{n.phone_number}</p>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                        n.status === 'connected'
                          ? 'text-[#00E5A0] border-[#00E5A0]/30 bg-[#00E5A0]/10'
                          : 'text-[var(--muted)] border-[var(--border)] bg-[var(--bg)]'
                      }`}>
                        <CheckCircle2 size={12} /> {n.status === 'connected' ? 'Conectado' : 'Desconectado'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Box>
          )}

          {step === 'pagos' && (
            <Box className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)] mb-1">Métodos de pago</h3>
                <p className="text-xs text-[var(--muted)] mb-3">Describe cómo pagan tus clientes. Tu agente lo usará para responder consultas de pago.</p>
              </div>
              <textarea
                value={paymentInfo}
                onChange={e => setPaymentInfo(e.target.value)}
                rows={6}
                placeholder="Ej: Aceptamos Yape, Plin y transferencia bancaria BCP. También pago contraentrega en Lima."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl resize-none bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
              />
              <SaveBar saving={profileSaving} saved={profileSaved} onSave={saveProfile} />
            </Box>
          )}

          {step === 'envios' && (
            <Box className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)] mb-1">Zonas y costos de envío</h3>
                <p className="text-xs text-[var(--muted)] mb-3">Describe tus zonas de reparto, tiempos y costos. Tu agente lo usará para responder consultas de envío.</p>
              </div>
              <textarea
                value={shippingInfo}
                onChange={e => setShippingInfo(e.target.value)}
                rows={6}
                placeholder="Ej: Envíos a todo Lima en 24-48h, costo S/10. Provincias vía Shalom, 3-5 días."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl resize-none bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
              />
              <SaveBar saving={profileSaving} saved={profileSaved} onSave={saveProfile} />
            </Box>
          )}
        </div>
      </div>

      <Modal open={simulatorOpen} onClose={() => setSimulatorOpen(false)} title="Simular conversación" maxWidth="max-w-md">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--muted)]">{agent.training_blocks.length} bloques activos. No se guarda.</p>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${getSimUsage().count >= MAX_DAILY_MSGS ? 'text-[#FF4D6A]' : 'text-[var(--muted)]'}`}>
                {MAX_DAILY_MSGS - getSimUsage().count}/{MAX_DAILY_MSGS} hoy
              </span>
              <button onClick={() => setChatHistory([])} className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer">Limpiar ✕</button>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden border border-[var(--border)] shadow-xl">
            <div className="flex items-center gap-3 px-4 py-3 bg-[#075E54]">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366]/20">
                <Bot size={18} className="text-[#25D366]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{agent.name}</p>
                <p className="text-[10px] text-green-300">{responding ? 'escribiendo...' : 'en línea'}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 p-4 overflow-y-auto" style={{ minHeight: '320px', maxHeight: '360px', background: '#0e1621' }}>
              {chatHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2 py-10">
                  <MessageSquare size={24} className="text-[#25D366]" />
                  <p className="text-xs text-[var(--muted)]">Envía un mensaje para probar tu agente</p>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#25D366]/20 mr-1.5 mt-1 shrink-0"><Bot size={12} className="text-[#25D366]" /></div>}
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm ${msg.role === 'user' ? 'rounded-tr-sm bg-[#005c4b] text-white' : 'rounded-tl-sm bg-[#1f2c34] text-[#F2F2F2]'}`}>
                    <p className="leading-relaxed">{msg.content}</p>
                    <p className={`mt-1 text-[10px] text-right ${msg.role === 'user' ? 'text-green-300/60' : 'text-[var(--muted)]'}`}>
                      {new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {msg.role === 'user' && <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)]/20 ml-1.5 mt-1 shrink-0"><User size={12} className="text-[var(--primary)]" /></div>}
                </div>
              ))}
              {responding && (
                <div className="flex justify-start">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#25D366]/20 mr-1.5 mt-1"><Bot size={12} className="text-[#25D366]" /></div>
                  <div className="rounded-2xl rounded-tl-sm bg-[#1f2c34] px-4 py-3">
                    <div className="flex gap-1 items-center">
                      {[0, 150, 300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
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
                className="flex-1 rounded-full bg-[#2a3942] px-4 py-2 text-sm text-[#F2F2F2] placeholder:text-[var(--muted)] border border-[#3a4a52] focus:border-[#25D366]" />
              <button onClick={sendMessage} disabled={!userInput.trim() || responding}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] hover:bg-[#20b857] disabled:opacity-50 transition-colors cursor-pointer shrink-0">
                <Send size={16} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function SaveBar({ saving, saved, onSave }: { saving: boolean; saved: boolean; onSave: () => void }) {
  return (
    <div className="flex justify-end pt-1">
      <button
        onClick={onSave}
        disabled={saving}
        className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl font-semibold transition-all cursor-pointer disabled:opacity-40 ${saved ? 'bg-[#00E5A0] text-[var(--bg)]' : 'bg-[var(--primary)] hover:bg-[var(--primary-dim)] text-white'}`}
      >
        {saving ? <><Loader2 size={13} className="animate-spin" />Guardando...</>
          : saved ? <><Check size={13} />Guardado</>
          : 'Guardar cambios'}
      </button>
    </div>
  )
}
