'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Navbar } from '@/components/layout/Navbar'
import { getSession } from '@/lib/auth'
import type { User } from '@/types'

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const session = getSession()
    if (!session || session.user.role !== 'client') {
      router.push('/login')
      return
    }
    setUser(session.user)
  }, [router])

  if (!user) return null

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar role="client" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Navbar user={user} onMenuClick={() => setSidebarOpen(o => !o)} />
      <main className="md:ml-60 pt-16 min-h-screen">
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  )
}
