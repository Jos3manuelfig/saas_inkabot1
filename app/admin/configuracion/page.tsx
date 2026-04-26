'use client'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Settings, Globe, Bell, Shield } from 'lucide-react'

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#e8e8f0]">Configuración</h2>
        <p className="text-sm text-[#8888aa] mt-0.5">Ajustes generales de la plataforma</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-2.5 mb-4">
            <Globe size={16} className="text-[#6c3fff]" />
            <h3 className="text-sm font-semibold text-[#e8e8f0]">API & Integraciones</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#8888aa] mb-1">URL de la API</label>
              <input
                defaultValue="https://api.inkabot.pe"
                className="w-full rounded-lg border border-[#1e1e30] bg-[#0f0f1a] px-3 py-2 text-sm text-[#e8e8f0] focus:border-[#6c3fff] focus:outline-none"
                readOnly
              />
            </div>
            <div>
              <label className="block text-xs text-[#8888aa] mb-1">Webhook URL</label>
              <input
                placeholder="https://tu-webhook.com/wh"
                className="w-full rounded-lg border border-[#1e1e30] bg-[#0f0f1a] px-3 py-2 text-sm text-[#e8e8f0] focus:border-[#6c3fff] focus:outline-none"
              />
            </div>
            <Button size="sm" variant="secondary">Guardar cambios</Button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2.5 mb-4">
            <Bell size={16} className="text-[#00e5ff]" />
            <h3 className="text-sm font-semibold text-[#e8e8f0]">Notificaciones</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Alertas de desconexión WhatsApp', on: true },
              { label: 'Notificación de pagos pendientes', on: true },
              { label: 'Reporte diario de mensajes', on: false },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-[#e8e8f0]">{item.label}</span>
                <div className={`relative h-5 w-9 rounded-full cursor-pointer transition-colors ${item.on ? 'bg-[#6c3fff]' : 'bg-[#1e1e30]'}`}>
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${item.on ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2.5 mb-4">
            <Shield size={16} className="text-green-400" />
            <h3 className="text-sm font-semibold text-[#e8e8f0]">Seguridad</h3>
          </div>
          <div className="space-y-3 text-sm text-[#8888aa]">
            <p>JWT Token expira en: <span className="text-[#e8e8f0]">24 horas</span></p>
            <p>Autenticación de 2 factores: <span className="text-yellow-400">No configurado</span></p>
            <Button size="sm" variant="secondary">Configurar 2FA</Button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2.5 mb-4">
            <Settings size={16} className="text-[#8888aa]" />
            <h3 className="text-sm font-semibold text-[#e8e8f0]">Planes disponibles</h3>
          </div>
          <div className="space-y-2">
            {[
              { plan: 'Básico', price: 'S/ 99/mes', features: '500 msgs/día' },
              { plan: 'Pro', price: 'S/ 150/mes', features: '2,000 msgs/día' },
              { plan: 'Enterprise', price: 'S/ 350/mes', features: 'Sin límite' },
            ].map(p => (
              <div key={p.plan} className="flex items-center justify-between rounded-lg border border-[#1e1e30] px-3 py-2">
                <div>
                  <span className="text-sm font-medium text-[#e8e8f0]">{p.plan}</span>
                  <span className="ml-2 text-xs text-[#8888aa]">{p.features}</span>
                </div>
                <span className="text-sm font-semibold text-[#6c3fff]">{p.price}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
