import type { Client, MessageStat, Lead, Payment, AdminStats } from '@/types'

export const mockClients: Client[] = [
  {
    id: '1',
    name: 'Restaurante El Inka',
    email: 'contacto@elinka.pe',
    phone: '+51 987 654 321',
    whatsappNumber: '+51987654321',
    whatsappStatus: 'connected',
    plan: 'Pro',
    status: 'active',
    expiryDate: '2026-06-15',
    botActive: true,
    createdAt: '2025-01-10',
  },
  {
    id: '2',
    name: 'Clínica San Borja',
    email: 'info@clinicasanborja.pe',
    phone: '+51 976 543 210',
    whatsappNumber: '+51976543210',
    whatsappStatus: 'connected',
    plan: 'Enterprise',
    status: 'active',
    expiryDate: '2026-08-30',
    botActive: true,
    createdAt: '2024-11-05',
  },
  {
    id: '3',
    name: 'Moda Lima Store',
    email: 'ventas@modalima.pe',
    phone: '+51 965 432 109',
    whatsappNumber: '+51965432109',
    whatsappStatus: 'disconnected',
    plan: 'Básico',
    status: 'expiring',
    expiryDate: '2026-05-02',
    botActive: false,
    createdAt: '2025-02-20',
  },
  {
    id: '4',
    name: 'Academia Fitness Pro',
    email: 'admin@fitnesspro.pe',
    phone: '+51 954 321 098',
    whatsappNumber: '+51954321098',
    whatsappStatus: 'connected',
    plan: 'Pro',
    status: 'active',
    expiryDate: '2026-07-10',
    botActive: true,
    createdAt: '2025-03-01',
  },
  {
    id: '5',
    name: 'Inmobiliaria Andina',
    email: 'contacto@andina.pe',
    phone: '+51 943 210 987',
    whatsappNumber: '+51943210987',
    whatsappStatus: 'disconnected',
    plan: 'Básico',
    status: 'inactive',
    expiryDate: '2025-12-01',
    botActive: false,
    createdAt: '2024-09-15',
  },
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

export const mockLeads: Lead[] = [
  { id: 'l1', name: 'Carlos Ríos', phone: '+51911111111', stage: 'nuevo', clientId: '1', createdAt: '2026-04-20' },
  { id: 'l2', name: 'María Flores', phone: '+51922222222', stage: 'contactado', clientId: '1', createdAt: '2026-04-18' },
  { id: 'l3', name: 'Juan Torres', phone: '+51933333333', stage: 'calificado', clientId: '1', createdAt: '2026-04-15' },
  { id: 'l4', name: 'Ana Vargas', phone: '+51944444444', stage: 'propuesta', clientId: '1', createdAt: '2026-04-12' },
  { id: 'l5', name: 'Pedro Silva', phone: '+51955555555', stage: 'cerrado', clientId: '1', createdAt: '2026-04-10' },
  { id: 'l6', name: 'Lucia Mendoza', phone: '+51966666666', stage: 'cerrado', clientId: '1', createdAt: '2026-04-08' },
]

export const mockPayments: Payment[] = [
  { id: 'p1', clientId: '1', amount: 150, date: '2026-03-01', plan: 'Pro', method: 'Tarjeta', status: 'paid' },
  { id: 'p2', clientId: '1', amount: 150, date: '2026-02-01', plan: 'Pro', method: 'Transferencia', status: 'paid' },
  { id: 'p3', clientId: '1', amount: 99, date: '2026-01-01', plan: 'Básico', method: 'Yape', status: 'paid' },
  { id: 'p4', clientId: '2', amount: 350, date: '2026-03-15', plan: 'Enterprise', method: 'Transferencia', status: 'paid' },
  { id: 'p5', clientId: '3', amount: 99, date: '2026-03-20', plan: 'Básico', method: 'Tarjeta', status: 'pending' },
]

export const mockAdminStats: AdminStats = {
  totalClients: 5,
  activeClients: 3,
  messagesToday: 487,
  monthlyRevenue: 1248,
}

export const mockClientMessageStats: MessageStat[] = [
  { date: '20 Abr', sent: 68, received: 54 },
  { date: '21 Abr', sent: 82, received: 71 },
  { date: '22 Abr', sent: 55, received: 48 },
  { date: '23 Abr', sent: 103, received: 91 },
  { date: '24 Abr', sent: 79, received: 63 },
  { date: '25 Abr', sent: 124, received: 108 },
  { date: '26 Abr', sent: 97, received: 84 },
]
