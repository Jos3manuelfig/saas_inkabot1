'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User, ChevronDown, Bell } from 'lucide-react'
import { clearSession } from '@/lib/auth'
import type { User as UserType } from '@/types'

export function Navbar({ user }: { user: UserType }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <header className="fixed top-0 left-60 right-0 h-[60px] flex items-center justify-between px-6 bg-[#0D0F14]/90 backdrop-blur-md border-b border-[#2A2F42] z-30">
      <div />
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-xl text-[#6B7280] hover:text-[#E8EAF0] hover:bg-[#1C2030] transition-colors cursor-pointer">
          <Bell size={16} />
        </button>

        <div className="relative">
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#2A2F42] bg-[#141720] hover:bg-[#1C2030] transition-colors cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7B61FF]/20">
              <User size={13} className="text-[#7B61FF]" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-medium text-[#E8EAF0] leading-none">{user.name}</p>
              <p className="text-[10px] text-[#6B7280] mt-0.5">{user.role === 'admin' ? 'Administrador' : 'Cliente'}</p>
            </div>
            <ChevronDown size={13} className={`text-[#6B7280] transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-44 rounded-xl border border-[#2A2F42] bg-[#141720] shadow-2xl overflow-hidden z-50 animate-fadeIn">
              <div className="px-3 py-2.5 border-b border-[#2A2F42]">
                <p className="text-xs font-medium text-[#E8EAF0]">{user.name}</p>
                <p className="text-[10px] text-[#6B7280]">{user.email}</p>
              </div>
              <button
                onClick={() => { clearSession(); router.push('/login') }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-[#FF4D6A] hover:bg-[#FF4D6A]/10 transition-colors cursor-pointer"
              >
                <LogOut size={13} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
