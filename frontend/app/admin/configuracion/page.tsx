'use client'

import { useState } from 'react'
import { User, Lock, Tag, Save, Eye, EyeOff, PhoneCall } from 'lucide-react'

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-[#141720] border border-[#2A2F42] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#2A2F42]">
        <span className="text-[#7B61FF]">{icon}</span>
        <h3 className="text-sm font-semibold text-[#E8EAF0]">{title}</h3>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#6B7280] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

export default function ConfiguracionPage() {
  const [account, setAccount] = useState({ name: 'José Manuel', email: 'admin@inkabot.pe' })
  const [handoffPhone, setHandoffPhone] = useState('+51 924 940 724')
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [saved, setSaved] = useState(false)

  const [plans, setPlans] = useState([
    { id: 'emprendedor', name: 'Emprendedor', price: 79, msgs: 500, desc: 'Ideal para negocios pequeños que empiezan' },
    { id: 'profesional', name: 'Profesional', price: 149, msgs: 2000, desc: 'Para negocios con mayor volumen de clientes' },
    { id: 'pro', name: 'Pro', price: 149, msgs: 2000, desc: 'Plan Pro con funciones avanzadas' },
    { id: 'enterprise', name: 'Enterprise', price: 349, msgs: -1, desc: 'Para empresas con necesidades especiales' },
  ])

  function handleSaveAccount() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function updatePlanPrice(id: string, price: number) {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, price } : p))
  }

  return (
    <div className="space-y-5 animate-fadeIn max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EAF0]">Configuración</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Ajustes de tu cuenta y la plataforma</p>
      </div>

      {/* Mi cuenta */}
      <Section title="Mi cuenta" icon={<User size={16} />}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre completo">
              <input value={account.name} onChange={e => setAccount(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm rounded-xl" />
            </Field>
            <Field label="Email">
              <input type="email" value={account.email} onChange={e => setAccount(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm rounded-xl" />
            </Field>
          </div>
          <button onClick={handleSaveAccount}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-medium transition-all cursor-pointer ${saved ? 'bg-[#00E5A0]/15 text-[#00E5A0] border border-[#00E5A0]/30' : 'bg-[#7B61FF] text-white hover:bg-[#5B41DF]'}`}>
            <Save size={13} /> {saved ? '¡Guardado!' : 'Guardar cambios'}
          </button>
        </div>
      </Section>

      {/* Cambiar contraseña */}
      <Section title="Cambiar contraseña" icon={<Lock size={16} />}>
        <div className="space-y-4">
          {['current', 'new', 'confirm'].map((k, i) => (
            <Field key={k} label={['Contraseña actual', 'Nueva contraseña', 'Confirmar contraseña'][i]}>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={passwords[k as keyof typeof passwords]}
                  onChange={e => setPasswords(p => ({ ...p, [k]: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 text-sm rounded-xl"
                />
                {i === 0 && (
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#E8EAF0] cursor-pointer">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </div>
            </Field>
          ))}
          <button className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-[#7B61FF] text-white font-medium hover:bg-[#5B41DF] transition-colors cursor-pointer">
            <Lock size={13} /> Actualizar contraseña
          </button>
        </div>
      </Section>

      {/* Desvío a humano */}
      <Section title="Desvío a atención humana" icon={<PhoneCall size={16} />}>
        <p className="text-xs text-[#6B7280] mb-4">
          Cuando un cliente solicite hablar con una persona, el bot enviará este número de WhatsApp.
        </p>
        <Field label="Número de WhatsApp personal">
          <div className="flex gap-3">
            <input value={handoffPhone} onChange={e => setHandoffPhone(e.target.value)}
              placeholder="+51 924 940 724" className="flex-1 px-3 py-2.5 text-sm rounded-xl" />
            <button className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-[#7B61FF] text-white font-medium hover:bg-[#5B41DF] transition-colors cursor-pointer whitespace-nowrap">
              <Save size={13} /> Guardar
            </button>
          </div>
        </Field>
        <div className="mt-3 rounded-xl bg-[#00E5A0]/8 border border-[#00E5A0]/20 px-3 py-2.5">
          <p className="text-xs text-[#00E5A0] font-medium">Mensaje automático del bot:</p>
          <p className="text-xs text-[#6B7280] mt-1">
            "Entendido 😊 Te conecto con un asesor. Escríbele directamente a: wa.me/51924940724"
          </p>
        </div>
      </Section>

      {/* Planes */}
      <Section title="Planes disponibles" icon={<Tag size={16} />}>
        <p className="text-xs text-[#6B7280] mb-4">Edita los precios de los planes. Los cambios aplican a nuevas suscripciones.</p>
        <div className="space-y-3">
          {plans.map(plan => (
            <div key={plan.id} className="flex items-center justify-between p-4 rounded-xl border border-[#2A2F42] bg-[#1C2030]">
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#E8EAF0]">{plan.name}</p>
                <p className="text-xs text-[#6B7280] mt-0.5">{plan.desc}</p>
                <p className="text-xs text-[#6B7280] mt-0.5">{plan.msgs === -1 ? 'Mensajes ilimitados' : `${plan.msgs.toLocaleString()} msgs/día`}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6B7280]">S/</span>
                <input
                  type="number"
                  value={plan.price}
                  onChange={e => updatePlanPrice(plan.id, Number(e.target.value))}
                  className="w-20 px-2.5 py-1.5 text-sm font-bold text-[#00E5A0] text-center rounded-lg"
                />
                <span className="text-xs text-[#6B7280]">/mes</span>
              </div>
            </div>
          ))}
        </div>
        <button className="mt-4 flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-[#7B61FF] text-white font-medium hover:bg-[#5B41DF] transition-colors cursor-pointer">
          <Save size={13} /> Guardar precios
        </button>
      </Section>
    </div>
  )
}
