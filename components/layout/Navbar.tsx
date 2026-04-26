'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, ChevronDown, User } from 'lucide-react'
import { clearSession } from '@/lib/auth'
import type { User as UserType } from '@/types'

interface NavbarProps {
  user: UserType
  title?: string
}

export function Navbar({ user, title }: NavbarProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  function handleLogout() {
    clearSession()
    router.push('/login')
  }

  return (
    <header className="fixed top-0 left-60 right-0 h-16 flex items-center justify-between px-6 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-[#1e1e30] z-30">
      <div>
        {title && <h1 className="text-base font-semibold text-[#e8e8f0]">{title}</h1>}
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2.5 rounded-lg border border-[#1e1e30] bg-[#13131f] px-3 py-2 text-sm text-[#e8e8f0] hover:bg-[#1a1a2e] transition-colors cursor-pointer"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6c3fff]/20 text-[#6c3fff]">
            <User size={14} />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-medium leading-none">{user.name}</p>
            <p className="mt-0.5 text-[10px] text-[#8888aa] capitalize">{user.role === 'admin' ? 'Administrador' : 'Cliente'}</p>
          </div>
          <ChevronDown size={14} className={`text-[#8888aa] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 rounded-xl border border-[#1e1e30] bg-[#13131f] shadow-xl shadow-black/40 py-1 z-50">
            <div className="px-3 py-2 border-b border-[#1e1e30]">
              <p className="text-xs font-medium text-[#e8e8f0]">{user.name}</p>
              <p className="text-[10px] text-[#8888aa]">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
