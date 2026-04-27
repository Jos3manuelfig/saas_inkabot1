export type Plan = 'Emprendedor' | 'Profesional' | 'Pro' | 'Enterprise' | 'Básico'
export type ClientStatus = 'active' | 'inactive' | 'expiring'
export type WAStatus = 'connected' | 'disconnected'
export type PaymentMethod = 'Yape' | 'Plin' | 'Transferencia' | 'Tarjeta' | 'Efectivo'
export type PaymentStatus = 'paid' | 'pending'

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  plan: Plan
  status: ClientStatus
  waStatus: WAStatus
  expiryDate: string
  botActive: boolean
  createdAt: string
}

export interface Payment {
  id: string
  clientId: string
  clientName: string
  amount: number
  method: PaymentMethod
  date: string
  status: PaymentStatus
  plan: Plan
}

export interface MessageStat {
  date: string
  sent: number
  received: number
}

export const mockClients: Client[] = [
  { id: '1', name: 'Restaurante El Inka',  email: 'contacto@elinka.pe',      phone: '+51987654321', plan: 'Pro',        status: 'active',   waStatus: 'connected',    expiryDate: '2026-06-14', botActive: true,  createdAt: '2025-01-10' },
  { id: '2', name: 'Clínica San Borja',    email: 'info@clinicasanborja.pe', phone: '+51976543210', plan: 'Enterprise', status: 'active',   waStatus: 'connected',    expiryDate: '2026-08-29', botActive: true,  createdAt: '2024-11-05' },
  { id: '3', name: 'Moda Lima Store',      email: 'ventas@modalima.pe',      phone: '+51965432109', plan: 'Básico',     status: 'expiring', waStatus: 'disconnected', expiryDate: '2026-05-01', botActive: false, createdAt: '2025-02-20' },
  { id: '4', name: 'Academia Fitness Pro', email: 'admin@fitnesspro.pe',     phone: '+51954321098', plan: 'Pro',        status: 'active',   waStatus: 'connected',    expiryDate: '2026-07-09', botActive: true,  createdAt: '2025-03-01' },
  { id: '5', name: 'Inmobiliaria Andina',  email: 'contacto@andina.pe',      phone: '+51943210987', plan: 'Emprendedor',status: 'inactive', waStatus: 'disconnected', expiryDate: '2025-12-01', botActive: false, createdAt: '2024-09-15' },
]

export const mockPayments: Payment[] = [
  { id: 'p1', clientId: '1', clientName: 'Restaurante El Inka',  amount: 150, method: 'Yape',         date: '2026-04-01', status: 'paid',    plan: 'Pro' },
  { id: 'p2', clientId: '2', clientName: 'Clínica San Borja',    amount: 350, method: 'Transferencia', date: '2026-04-03', status: 'paid',    plan: 'Enterprise' },
  { id: 'p3', clientId: '3', clientName: 'Moda Lima Store',       amount: 99,  method: 'Plin',          date: '2026-04-05', status: 'pending', plan: 'Básico' },
  { id: 'p4', clientId: '4', clientName: 'Academia Fitness Pro',  amount: 150, method: 'Yape',         date: '2026-03-15', status: 'paid',    plan: 'Pro' },
  { id: 'p5', clientId: '5', clientName: 'Inmobiliaria Andina',   amount: 79,  method: 'Transferencia', date: '2026-03-01', status: 'paid',    plan: 'Emprendedor' },
  { id: 'p6', clientId: '1', clientName: 'Restaurante El Inka',  amount: 150, method: 'Yape',         date: '2026-03-01', status: 'paid',    plan: 'Pro' },
]

export const mockMessageStats: MessageStat[] = [
  { date: '20 Abr', sent: 342, received: 289 },
  { date: '21 Abr', sent: 415, received: 367 },
  { date: '22 Abr', sent: 287, received: 241 },
  { date: '23 Abr', sent: 523, received: 478 },
  { date: '24 Abr', sent: 398, received: 321 },
  { date: '25 Abr', sent: 612, received: 543 },
  { date: '26 Abr', sent: 487, received: 412 },
]

export function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}
