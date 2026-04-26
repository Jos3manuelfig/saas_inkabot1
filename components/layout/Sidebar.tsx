'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import {
  LayoutDashboard, Users, BarChart2, CreditCard,
  Settings, Bot, PieChart, Star,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: ReactNode
}

const adminNav: NavItem[] = [
  { label: 'Dashboard',     href: '/admin/dashboard',    icon: <LayoutDashboard size={18} /> },
  { label: 'Clientes',      href: '/admin/clientes',     icon: <Users size={18} /> },
  { label: 'Estadísticas',  href: '/admin/estadisticas', icon: <BarChart2 size={18} /> },
  { label: 'Pagos',         href: '/admin/pagos',        icon: <CreditCard size={18} /> },
  { label: 'Configuración', href: '/admin/configuracion',icon: <Settings size={18} /> },
]

const clientNav: NavItem[] = [
  { label: 'Mi Dashboard',    href: '/cliente/dashboard',   icon: <LayoutDashboard size={18} /> },
  { label: 'Estadísticas',    href: '/cliente/estadisticas',icon: <PieChart size={18} /> },
  { label: 'Mi Plan',         href: '/cliente/plan',        icon: <Star size={18} /> },
]

interface SidebarProps {
  role: 'admin' | 'client'
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const items = role === 'admin' ? adminNav : clientNav

  return (
    <aside className="fixed left-0 top-0 h-full w-60 flex flex-col bg-[#0f0f1a] border-r border-[#1e1e30] z-40">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#1e1e30]">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#6c3fff]">
          <Bot size={20} className="text-white" />
        </div>
        <div>
          <span className="text-lg font-bold tracking-wide text-white">INKA</span>
          <span className="text-lg font-bold tracking-wide text-[#6c3fff]">BOT</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {items.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-[#6c3fff]/15 text-[#6c3fff] border border-[#6c3fff]/30'
                  : 'text-[#8888aa] hover:bg-[#1a1a2e] hover:text-[#e8e8f0]'
              }`}
            >
              {item.icon}
              {item.label}
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#6c3fff]" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-[#1e1e30]">
        <div className="rounded-lg bg-[#6c3fff]/10 border border-[#6c3fff]/20 px-3 py-2.5 text-xs text-[#8888aa]">
          <span className="text-[#6c3fff] font-medium">INKABOT</span> v1.0.0
          <p className="mt-0.5 text-[10px]">Dashboard SaaS</p>
        </div>
      </div>
    </aside>
  )
}
