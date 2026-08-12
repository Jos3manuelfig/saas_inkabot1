'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, Eye, EyeOff, Loader2 } from 'lucide-react'
import { login, saveSession } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const ERROR_MESSAGES: Record<string, string> = {
    INVALID_CREDENTIALS: 'Correo o contraseña incorrectos. Intenta de nuevo.',
    NETWORK_ERROR: 'No se pudo conectar al servidor. Intenta más tarde.',
    SERVER_ERROR: 'Error del servidor. Intenta más tarde.',
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(email, password)
      saveSession(result.user, result.token)
      if (result.user.role === 'admin') router.push('/admin/dashboard')
      else router.push('/cliente/dashboard')
    } catch (err) {
      const code = err instanceof Error ? err.message : ''
      setError(ERROR_MESSAGES[code] ?? 'Correo o contraseña incorrectos. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  function clearError() {
    if (error) setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[var(--primary)]/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[var(--primary)]/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)] shadow-[0_0_30px_rgba(255,122,26,0.4)] mb-4">
            <Bot size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--text)] tracking-wide">
            INKA<span className="text-[var(--primary)]">BOT</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Gestión de Chatbots WhatsApp</p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-2xl shadow-black/50">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); clearError() }}
                placeholder="admin@inkabot.pe"
                required
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearError() }}
                  placeholder="••••••••"
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
              {loading ? <><Loader2 size={15} className="animate-spin" /> Ingresando...</> : 'Ingresar'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            ¿No tienes cuenta?{' '}
            <a href="/registro" className="text-[var(--primary)] hover:text-[var(--primary-dim)] font-medium">
              Crear vendedor IA
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
