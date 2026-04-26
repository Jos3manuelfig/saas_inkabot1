'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, Eye, EyeOff, Loader2 } from 'lucide-react'
import { mockLogin, saveSession } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    const result = mockLogin(email, password)
    setLoading(false)
    if (!result) {
      setError('Credenciales incorrectas. Intenta de nuevo.')
      return
    }
    saveSession(result.user, result.token)
    if (result.user.role === 'admin') router.push('/admin/dashboard')
    else router.push('/cliente/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#6c3fff]/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#00e5ff]/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6c3fff] shadow-[0_0_30px_rgba(108,63,255,0.4)] mb-4">
            <Bot size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-wide">
            INKA<span className="text-[#6c3fff]">BOT</span>
          </h1>
          <p className="mt-1 text-sm text-[#8888aa]">Gestión de Chatbots WhatsApp</p>
        </div>

        <div className="rounded-2xl border border-[#1e1e30] bg-[#13131f] p-8 shadow-2xl shadow-black/50">
          <h2 className="text-lg font-semibold text-[#e8e8f0] mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#8888aa] mb-1.5">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@inkabot.pe"
                required
                className="w-full rounded-lg border border-[#1e1e30] bg-[#0f0f1a] px-3.5 py-2.5 text-sm text-[#e8e8f0] placeholder:text-[#4a4a6a] focus:border-[#6c3fff] focus:outline-none focus:ring-1 focus:ring-[#6c3fff] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8888aa] mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-lg border border-[#1e1e30] bg-[#0f0f1a] px-3.5 py-2.5 pr-10 text-sm text-[#e8e8f0] placeholder:text-[#4a4a6a] focus:border-[#6c3fff] focus:outline-none focus:ring-1 focus:ring-[#6c3fff] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8888aa] hover:text-[#e8e8f0] cursor-pointer"
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
              className="mt-2 w-full rounded-lg bg-[#6c3fff] py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(108,63,255,0.3)] hover:bg-[#4f2dcc] disabled:opacity-70 transition-all duration-150 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Ingresando...</> : 'Ingresar'}
            </button>
          </form>

          <div className="mt-6 rounded-lg border border-[#1e1e30] bg-[#0f0f1a] p-3 text-xs text-[#8888aa] space-y-1">
            <p className="font-medium text-[#6c3fff]">Demo credentials:</p>
            <p>Admin: <span className="text-[#e8e8f0]">admin@inkabot.pe</span></p>
            <p>Cliente: <span className="text-[#e8e8f0]">contacto@elinka.pe</span></p>
            <p>Contraseña: <span className="text-[#e8e8f0]">demo123</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}
