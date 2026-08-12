'use client'

import { Suspense, useState, FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Bot, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { register } from '@/lib/auth'
import { AnimatedPanel } from '@/components/layout/AnimatedPanel'

const ERROR_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'No se pudo conectar al servidor. Intenta más tarde.',
  SERVER_ERROR: 'Error del servidor. Intenta más tarde.',
}

function RegistroForm() {
  const searchParams = useSearchParams()
  const initialPlan = searchParams.get('plan') === 'profesional' ? 'Profesional' : 'Emprendedor'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [plan, setPlan] = useState(initialPlan)
  const [showPass, setShowPass] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function clearError() {
    if (error) setError('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (!acceptedTerms) {
      setError('Debes aceptar los Términos y condiciones.')
      return
    }

    setLoading(true)
    try {
      await register({ name, email, phone: phone || undefined, password, plan })
      setDone(true)
    } catch (err) {
      const code = err instanceof Error ? err.message : ''
      setError(ERROR_MESSAGES[code] ?? code ?? 'No se pudo crear la cuenta. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    const whatsappText = encodeURIComponent(
      `Hola, acabo de crear mi cuenta en INKABOT (${email}) y quiero coordinar el pago para activarla.`
    )
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
        <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)]/15">
            <CheckCircle2 size={28} className="text-[var(--primary)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text)] mb-2">¡Cuenta creada!</h2>
          <p className="text-sm text-[var(--muted)] mb-6">
            Activaremos tu acceso en cuanto confirmemos el pago. Coordínalo con nosotros por WhatsApp.
          </p>
          <a
            href={`https://wa.me/51968201492?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg bg-[var(--primary)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-dim)] transition-colors"
          >
            Coordinar pago por WhatsApp
          </a>
          <Link href="/login" className="mt-4 block text-sm text-[var(--muted)] hover:text-[var(--text)]">
            Ya activé mi cuenta, ir a iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2 bg-[var(--bg)]">
      <AnimatedPanel />

      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-6 lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)] shadow-[0_0_30px_rgba(255,122,26,0.4)] mb-3">
              <Bot size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text)] tracking-wide">
              INKA<span className="text-[var(--primary)]">BOT</span>
            </h1>
          </div>

          <h2 className="text-xl font-semibold text-[var(--text)] mb-1">Crear cuenta</h2>
          <p className="text-sm text-[var(--muted)] mb-6">Regístrate para comenzar con tu vendedor IA</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Nombre del negocio</label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); clearError() }}
                placeholder="Restaurante El Inka"
                required
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); clearError() }}
                placeholder="contacto@tunegocio.pe"
                required
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">WhatsApp (opcional)</label>
              <input
                type="tel"
                value={phone}
                onChange={e => { setPhone(e.target.value); clearError() }}
                placeholder="+51 987 654 321"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Plan</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Emprendedor', 'Profesional'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlan(p)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                      plan === p
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                        : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearError() }}
                  placeholder="Mínimo 8 caracteres"
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3.5 py-2.5 pr-10 text-sm text-[var(--text)] placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Confirmar contraseña</label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); clearError() }}
                placeholder="Repite tu contraseña"
                required
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors"
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-[var(--muted)] cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={e => { setAcceptedTerms(e.target.checked); clearError() }}
                className="mt-0.5 accent-[var(--primary)]"
              />
              He leído y acepto los Términos y condiciones
            </label>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-[var(--primary)] py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(255,122,26,0.3)] hover:bg-[var(--primary-dim)] disabled:opacity-70 transition-all duration-150 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Creando cuenta...</> : 'Crear Cuenta'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-[var(--primary)] hover:text-[var(--primary-dim)] font-medium">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegistroPage() {
  return (
    <Suspense fallback={null}>
      <RegistroForm />
    </Suspense>
  )
}
