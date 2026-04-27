'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, BarChart2, CreditCard, Settings, Zap, Cpu } from 'lucide-react'

const adminNav = [
  { label: 'Dashboard',     href: '/admin/dashboard',     icon: LayoutDashboard },
  { label: 'Clientes',      href: '/admin/clientes',      icon: Users },
  { label: 'Estadísticas',  href: '/admin/estadisticas',  icon: BarChart2 },
  { label: 'Pagos',         href: '/admin/pagos',         icon: CreditCard },
  { label: 'Configuración', href: '/admin/configuracion', icon: Settings },
]

const clientNav = [
  { label: 'Mi Dashboard',   href: '/cliente/dashboard',    icon: LayoutDashboard },
  { label: 'Mis Vendedores', href: '/cliente/vendedores',   icon: Cpu },
  { label: 'Estadísticas',   href: '/cliente/estadisticas', icon: BarChart2 },
  { label: 'Mi Plan',        href: '/cliente/plan',         icon: Zap },
]

interface SidebarProps { role: 'admin' | 'client' }

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const items = role === 'admin' ? adminNav : clientNav

  return (
    <aside className="fixed inset-y-0 left-0 w-60 flex flex-col bg-[#0D0F14] border-r border-[#2A2F42] z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#2A2F42]">
        <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-[#7B61FF] shadow-[0_0_16px_rgba(123,97,255,0.5)]">
          <Zap size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-bold tracking-wider text-white">
          INKA<span className="text-[#7B61FF]">BOT</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {items.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                active
                  ? 'bg-[#7B61FF]/15 text-[#7B61FF]'
                  : 'text-[#6B7280] hover:text-[#E8EAF0] hover:bg-[#1C2030]'
              }`}
            >
              <Icon size={17} strokeWidth={active ? 2.5 : 2} />
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#7B61FF]" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[#2A2F42]">
        <div className="rounded-xl bg-[#7B61FF]/8 border border-[#7B61FF]/20 px-3 py-2.5">
          <p className="text-xs font-semibold text-[#7B61FF]">INKABOT Pro</p>
          <p className="text-[10px] text-[#6B7280] mt-0.5">Panel de administración</p>
        </div>
      </div>
    </aside>
  )
}
