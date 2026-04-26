import type { User } from '@/types'

const MOCK_USERS: User[] = [
  { id: '1', name: 'Admin INKABOT', email: 'admin@inkabot.pe', role: 'admin' },
  { id: '2', name: 'Restaurante El Inka', email: 'contacto@elinka.pe', role: 'client', clientId: '1' },
]

export function mockLogin(email: string, password: string): { user: User; token: string } | null {
  const user = MOCK_USERS.find(u => u.email === email)
  if (!user || password !== 'demo123') return null
  return { user, token: `mock_jwt_${user.id}_${Date.now()}` }
}

export function saveSession(user: User, token: string) {
  localStorage.setItem('inkabot_token', token)
  localStorage.setItem('inkabot_user', JSON.stringify(user))
}

export function getSession(): { user: User; token: string } | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('inkabot_token')
  const userStr = localStorage.getItem('inkabot_user')
  if (!token || !userStr) return null
  return { user: JSON.parse(userStr), token }
}

export function clearSession() {
  localStorage.removeItem('inkabot_token')
  localStorage.removeItem('inkabot_user')
}
