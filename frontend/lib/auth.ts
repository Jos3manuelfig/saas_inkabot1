import type { User } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8003'

export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    throw new Error('Credenciales incorrectas')
  }

  const json = await res.json()
  const token: string = json.data.access_token

  // Obtener datos del usuario con el token
  const meRes = await fetch(`${API_URL}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const meJson = await meRes.json()
  const userData = meJson.data

  const user: User = {
    id: userData.id,
    name: userData.full_name,
    email: userData.email,
    role: userData.role,
    clientId: userData.tenant_id ?? undefined,
  }

  return { user, token }
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
