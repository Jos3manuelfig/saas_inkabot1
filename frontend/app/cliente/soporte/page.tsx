'use client'

import { useState } from 'react'
import { MessageCircle, Mail, Copy, Check, ChevronDown, ChevronUp, ExternalLink, HelpCircle } from 'lucide-react'

const WA_URL = 'https://wa.me/51924940724?text=Hola%2C%20necesito%20ayuda%20con%20mi%20cuenta%20INKABOT'
const EMAIL   = 'contacto@inkabot.online'

const FAQS = [
  {
    q: '¿Cómo entreno a mi vendedor virtual?',
    a: 'Ve a Mis Vendedores → selecciona tu agente → abre la pestaña Entrenar y agrega bloques de información sobre tu negocio: precios, productos, horarios, preguntas frecuentes. Cuanta más información agregues, mejor responderá el bot.',
  },
  {
    q: '¿Por qué mi bot no responde en WhatsApp?',
    a: 'Verifica que tu número de WhatsApp esté correctamente conectado: en el panel admin puedes revisar la pestaña WABA del cliente. Si el token de Meta expiró (dura 24h en modo prueba), deberás generarlo nuevamente. Si el problema persiste, contáctanos por WhatsApp.',
  },
  {
    q: '¿Puedo cambiar mi plan?',
    a: 'Sí. Escríbenos por WhatsApp al +51 924 940 724 y te actualizamos el plan en menos de 24 horas. El cambio es inmediato una vez procesado.',
  },
  {
    q: '¿Cómo veo mis conversaciones?',
    a: 'En el menú lateral ve a Conversaciones. Verás todos los chats de tus clientes con su estado (activa, venta cerrada, venta perdida, derivado). Puedes filtrar por estado y archivar conversaciones antiguas.',
  },
  {
    q: '¿Qué pasa cuando llego al límite de conversaciones?',
    a: 'El bot dejará de responder automáticamente hasta que comience el próximo mes o hasta que actualices tu plan. Te recomendamos monitorear el uso en Mi Plan y contactarnos antes de llegar al límite.',
  },
]

function CopyEmailButton() {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(EMAIL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#2A2A2A] text-xs text-[#8A8A8A] hover:text-[#F2F2F2] hover:bg-[#1C1C1C] transition-colors cursor-pointer">
      {copied ? <><Check size={12} className="text-[#00E5A0]" /> Copiado</> : <><Copy size={12} /> Copiar</>}
    </button>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`border rounded-xl transition-colors ${open ? 'border-[#FF7A1A]/30 bg-[#FF7A1A]/5' : 'border-[#2A2A2A] bg-[#141414]'}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer"
      >
        <span className={`text-sm font-medium ${open ? 'text-[#FF7A1A]' : 'text-[#F2F2F2]'}`}>{q}</span>
        {open
          ? <ChevronUp size={16} className="text-[#FF7A1A] shrink-0" />
          : <ChevronDown size={16} className="text-[#8A8A8A] shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-[#8A8A8A] leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  )
}

export default function SoportePage() {
  return (
    <div className="space-y-8 animate-fadeIn max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[#F2F2F2]">Soporte</h1>
        <p className="text-sm text-[#8A8A8A] mt-0.5">Estamos aquí para ayudarte con tu cuenta INKABOT</p>
      </div>

      {/* Tarjetas de contacto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* WhatsApp */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366]/15">
              <MessageCircle size={22} className="text-[#25D366]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F2F2F2]">WhatsApp</p>
              <p className="text-xs text-[#8A8A8A]">+51 924 940 724</p>
            </div>
          </div>
          <p className="text-xs text-[#8A8A8A]">Respondemos en menos de 24 horas</p>
          <a href={WA_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20b857] text-white text-sm font-semibold transition-colors cursor-pointer">
            <MessageCircle size={15} />
            Escríbenos por WhatsApp
            <ExternalLink size={12} className="opacity-70" />
          </a>
        </div>

        {/* Email */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FF7A1A]/15">
              <Mail size={22} className="text-[#FF7A1A]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F2F2F2]">Email</p>
              <p className="text-xs text-[#8A8A8A]">Para consultas no urgentes</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] px-3 py-2.5">
            <span className="text-sm font-mono text-[#F2F2F2]">{EMAIL}</span>
            <CopyEmailButton />
          </div>
          <a href={`mailto:${EMAIL}`}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#FF7A1A]/40 text-[#FF7A1A] text-sm font-semibold hover:bg-[#FF7A1A]/10 transition-colors cursor-pointer">
            <Mail size={15} /> Enviar email
          </a>
        </div>
      </div>

      {/* FAQ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle size={16} className="text-[#FF7A1A]" />
          <h2 className="text-base font-semibold text-[#F2F2F2]">Preguntas frecuentes</h2>
        </div>
        <div className="space-y-2">
          {FAQS.map(faq => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-[#8A8A8A]">¿No encontraste lo que buscabas?</p>
        <a href={WA_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-[#25D366] hover:text-[#20b857] transition-colors cursor-pointer font-medium">
          <MessageCircle size={12} /> Contactar soporte ahora
        </a>
      </div>
    </div>
  )
}
