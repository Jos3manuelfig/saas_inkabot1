export type Role = 'admin' | 'client'

export type PlanType = 'Básico' | 'Pro' | 'Enterprise'

export type WhatsAppStatus = 'connected' | 'disconnected'

export type ClientStatus = 'active' | 'inactive' | 'expiring'

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  whatsappNumber: string
  whatsappStatus: WhatsAppStatus
  plan: PlanType
  status: ClientStatus
  expiryDate: string
  botActive: boolean
  createdAt: string
}

export interface MessageStat {
  date: string
  sent: number
  received: number
}

export interface Lead {
  id: string
  name: string
  phone: string
  stage: 'nuevo' | 'contactado' | 'calificado' | 'propuesta' | 'cerrado'
  clientId: string
  createdAt: string
}

export interface Payment {
  id: string
  clientId: string
  amount: number
  date: string
  plan: PlanType
  method: string
  status: 'paid' | 'pending'
}

export interface AdminStats {
  totalClients: number
  activeClients: number
  messagesToday: number
  monthlyRevenue: number
}

export interface ClientStats {
  messagesToday: number
  activeLeads: number
  closedLeadsThisMonth: number
}

export interface User {
  id: string
  name: string
  email: string
  role: Role
  avatar?: string
  clientId?: string
}
