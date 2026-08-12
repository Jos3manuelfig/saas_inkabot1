'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageSquare, Search, Bot, User, Loader2, Phone, RefreshCw, Archive, ArchiveRestore, ArrowLeft } from 'lucide-react'
import { getSession } from '@/lib/auth'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8003'

type ConvStatus = 'active' | 'sale_closed' | 'sale_lost' | 'human_handoff'
type MsgRole = 'user' | 'assistant'

interface ConversationItem {
  id: string
  user_phone: string
  status: ConvStatus
  is_archived: boolean
  last_message_at: string | null
  last_message: string | null
  message_count: number
  intent_summary: string | null
}

interface Message {
  id: string
  role: MsgRole
  content: string
  created_at: string
}

interface ConversationDetail {
  conversation: {
    id: string
    user_phone: string
    status: ConvStatus
    intent_summary: string | null
    last_message_at: string | null
  }
  messages: Message[]
}

const STATUS_CONFIG: Record<ConvStatus, { label: string; color: string; dot: string }> = {
  active:         { label: 'Activa',        color: 'text-[#00E5A0]',  dot: 'bg-[#00E5A0]' },
  sale_closed:    { label: 'Venta cerrada', color: 'text-[#FF7A1A]',  dot: 'bg-[#FF7A1A]' },
  sale_lost:      { label: 'Venta perdida', color: 'text-[#8A8A8A]',  dot: 'bg-[#8A8A8A]' },
  human_handoff:  { label: 'Derivado',      color: 'text-[#F59E0B]',  dot: 'bg-[#F59E0B]' },
}

function formatTime(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return d.toLocaleDateString('es-PE', { weekday: 'short' })
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}

function formatFullTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

function StatusPill({ status }: { status: ConvStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`flex items-center gap-1 text-[10px] font-medium ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function EmptyThread() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FF7A1A]/10">
        <MessageSquare size={28} className="text-[#FF7A1A]" />
      </div>
      <p className="text-sm font-medium text-[#F2F2F2]">Selecciona una conversación</p>
      <p className="text-xs text-[#8A8A8A]">Elige un chat de la lista para ver el historial completo</p>
    </div>
  )
}

export default function ConversacionesPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ConvStatus | ''>('')
  const [showArchived, setShowArchived] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const session = getSession()
  const tenantId = session?.user.clientId ?? ''
  const token = session?.token ?? ''
  const headers = { Authorization: `Bearer ${token}` }

  const fetchConversations = useCallback(async (archived = showArchived) => {
    setLoadingList(true)
    setSelected(null)
    setDetail(null)
    setMobileView('list')
    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/conversations/${tenantId}?archived=${archived}`,
        { headers }
      )
      if (res.ok) {
        const json = await res.json()
        setConversations(json.data ?? [])
      }
    } catch (e) {
      console.error('[conversaciones]', e)
    } finally {
      setLoadingList(false)
    }
  }, [tenantId, token, showArchived])

  const fetchDetail = useCallback(async (convId: string) => {
    setLoadingDetail(true)
    setDetail(null)
    try {
      const res = await fetch(`${BASE_URL}/api/v1/conversations/${tenantId}/${convId}/messages`, { headers })
      if (res.ok) {
        const json = await res.json()
        setDetail(json.data)
      }
    } catch (e) {
      console.error('[conv-detail]', e)
    } finally {
      setLoadingDetail(false)
    }
  }, [tenantId, token])

  useEffect(() => { fetchConversations(showArchived) }, [showArchived])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [detail])

  function selectConv(id: string) {
    setSelected(id)
    fetchDetail(id)
    setMobileView('detail')
  }

  const filtered = conversations.filter(c => {
    const q = search.toLowerCase()
    const matchQ = !q || c.user_phone.includes(q) || (c.last_message ?? '').toLowerCase().includes(q) || (c.intent_summary ?? '').toLowerCase().includes(q)
    const matchS = !filterStatus || c.status === filterStatus
    return matchQ && matchS
  })

  const selectedConv = conversations.find(c => c.id === selected)

  async function toggleArchive(convId: string, archive: boolean) {
    try {
      await fetch(
        `${BASE_URL}/api/v1/conversations/${tenantId}/${convId}/archive?archive=${archive}`,
        { method: 'PATCH', headers }
      )
      fetchConversations(showArchived)
    } catch (e) {
      console.error('[archive]', e)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F2F2F2]">Conversaciones</h1>
          <p className="text-sm text-[#8A8A8A] mt-0.5">
            {conversations.length} conversaciones {showArchived ? 'archivadas' : 'activas'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition-colors cursor-pointer ${
              showArchived
                ? 'border-[#FF7A1A]/50 text-[#FF7A1A] bg-[#FF7A1A]/10'
                : 'border-[#2A2A2A] text-[#8A8A8A] hover:text-[#F2F2F2] hover:bg-[#1C1C1C]'
            }`}
          >
            <Archive size={13} />
            <span className="hidden sm:inline">{showArchived ? 'Ver activas' : 'Ver archivadas'}</span>
          </button>
          <button
            onClick={() => fetchConversations(showArchived)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-[#2A2A2A] text-[#8A8A8A] hover:text-[#F2F2F2] hover:bg-[#1C1C1C] transition-colors cursor-pointer"
          >
            <RefreshCw size={13} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">

        {/* ── Panel izquierdo: lista ─────────────────────── */}
        <div className={`flex-col bg-[#141414] border border-[#2A2A2A] rounded-2xl overflow-hidden
          w-full md:w-80 md:shrink-0
          ${mobileView === 'list' ? 'flex' : 'hidden md:flex'}
        `}>
          {/* Búsqueda y filtro */}
          <div className="p-3 border-b border-[#2A2A2A] space-y-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A8A]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por teléfono o mensaje..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] text-[#F2F2F2] placeholder:text-[#8A8A8A] focus:outline-none focus:border-[#FF7A1A]"
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as ConvStatus | '')}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] text-[#F2F2F2] focus:outline-none focus:border-[#FF7A1A]"
            >
              <option value="">Todos los estados</option>
              {(Object.keys(STATUS_CONFIG) as ConvStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#1C1C1C]">
            {loadingList ? (
              <div className="flex justify-center py-10">
                <Loader2 size={18} className="animate-spin text-[#FF7A1A]" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#8A8A8A]">Sin conversaciones</div>
            ) : filtered.map(conv => {
              const isSelected = conv.id === selected
              return (
                <button
                  key={conv.id}
                  onClick={() => selectConv(conv.id)}
                  className={`w-full text-left px-4 py-3.5 transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#FF7A1A]/10 border-l-2 border-[#FF7A1A]' : 'hover:bg-[#1C1C1C]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A]">
                        <Phone size={14} className="text-[#8A8A8A]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#F2F2F2] truncate">{conv.user_phone}</p>
                        <StatusPill status={conv.status} />
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <span className="text-[10px] text-[#8A8A8A]">{formatTime(conv.last_message_at)}</span>
                      {conv.message_count > 0 && (
                        <span className="text-[9px] text-[#8A8A8A]">{conv.message_count} msg</span>
                      )}
                    </div>
                  </div>
                  {conv.last_message && (
                    <p className="mt-2 text-[11px] text-[#8A8A8A] line-clamp-2 leading-relaxed pl-11">
                      {conv.last_message}
                    </p>
                  )}
                  {conv.intent_summary && (
                    <p className="mt-1 text-[10px] text-[#FF7A1A]/70 truncate pl-11">{conv.intent_summary}</p>
                  )}
                </button>
              )
            })}
          </div>

          <div className="px-4 py-2.5 border-t border-[#2A2A2A] bg-[#0A0A0A]">
            <p className="text-[10px] text-[#8A8A8A]">{filtered.length} de {conversations.length} conversaciones</p>
          </div>
        </div>

        {/* ── Panel derecho: hilo de mensajes ───────────── */}
        <div className={`flex-col flex-1 min-w-0 bg-[#141414] border border-[#2A2A2A] rounded-2xl overflow-hidden
          ${mobileView === 'detail' ? 'flex' : 'hidden md:flex'}
        `}>
          {!selected ? (
            <EmptyThread />
          ) : (
            <>
              {/* Header del chat */}
              <div className="flex items-center gap-3 px-4 md:px-5 py-3.5 border-b border-[#2A2A2A] bg-[#0A0A0A]">
                {/* Botón volver — solo mobile */}
                <button
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-1.5 rounded-lg text-[#8A8A8A] hover:text-[#F2F2F2] hover:bg-[#1C1C1C] transition-colors cursor-pointer shrink-0"
                  aria-label="Volver a la lista"
                >
                  <ArrowLeft size={17} />
                </button>

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF7A1A]/15 shrink-0">
                  <Phone size={16} className="text-[#FF7A1A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#F2F2F2]">{selectedConv?.user_phone}</p>
                  {selectedConv && <StatusPill status={selectedConv.status} />}
                </div>
                {detail?.conversation.intent_summary && (
                  <div className="hidden sm:block max-w-xs">
                    <p className="text-[10px] text-[#8A8A8A] text-right truncate">{detail.conversation.intent_summary}</p>
                  </div>
                )}
                <button
                  onClick={() => selectedConv && toggleArchive(selectedConv.id, !selectedConv.is_archived)}
                  title={selectedConv?.is_archived ? 'Restaurar conversación' : 'Archivar conversación'}
                  className="p-1.5 rounded-lg text-[#8A8A8A] hover:text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-colors cursor-pointer shrink-0"
                >
                  {selectedConv?.is_archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                </button>
              </div>

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: '#0e1621' }}>
                {loadingDetail ? (
                  <div className="flex justify-center py-10">
                    <Loader2 size={18} className="animate-spin text-[#FF7A1A]" />
                  </div>
                ) : !detail || detail.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 py-10">
                    <p className="text-xs text-[#8A8A8A]">Esta conversación no tiene mensajes</p>
                  </div>
                ) : (
                  <>
                    {detail.messages.map((msg) => {
                      const isBot = msg.role === 'assistant'
                      return (
                        <div key={msg.id} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
                          {isBot && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00E5A0]/15 mr-2 mt-1 shrink-0">
                              <Bot size={12} className="text-[#00E5A0]" />
                            </div>
                          )}
                          <div className={`max-w-[72%] rounded-2xl px-3.5 py-2.5 ${isBot ? 'rounded-tl-sm bg-[#1f2c34]' : 'rounded-tr-sm bg-[#1a1040]'}`}>
                            <p className="text-sm text-[#F2F2F2] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <p className={`mt-1 text-[10px] text-right ${isBot ? 'text-[#8A8A8A]' : 'text-[#FF7A1A]/60'}`}>
                              {formatFullTime(msg.created_at)}
                            </p>
                          </div>
                          {!isBot && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF7A1A]/15 ml-2 mt-1 shrink-0">
                              <User size={12} className="text-[#FF7A1A]" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Footer informativo */}
              <div className="px-5 py-2.5 border-t border-[#2A2A2A] bg-[#0A0A0A] flex items-center justify-between">
                <p className="text-[10px] text-[#8A8A8A]">{detail?.messages.length ?? 0} mensajes en esta conversación</p>
                <p className="text-[10px] text-[#8A8A8A] hidden sm:block">Solo lectura — los mensajes son enviados por WhatsApp</p>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
