import type { User } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8003'

export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  let res: Response
  try {
    res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch {
    throw new Error('NETWORK_ERROR')
  }

  if (res.status === 401) throw new Error('INVALID_CREDENTIALS')
  if (!res.ok) throw new Error('SERVER_ERROR')

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

export interface RegisterPayload {
  name: string
  email: string
  phone?: string
  password: string
  plan: string
}

export async function register(payload: RegisterPayload): Promise<{ tenantId: string; email: string }> {
  let res: Response
  try {
    res = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('NETWORK_ERROR')
  }

  const json = await res.json().catch(() => ({}))

  if (res.status === 400) throw new Error(json?.detail ?? 'EMAIL_IN_USE')
  if (!res.ok) throw new Error('SERVER_ERROR')

  return { tenantId: json.data.tenant_id, email: json.data.email }
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
