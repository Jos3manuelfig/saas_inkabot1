'use client'

import { useEffect, useRef } from 'react'
import { Bot, MessageSquare, TrendingUp, Zap } from 'lucide-react'

export function AnimatedPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    const particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; opacity: number }> = []

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 122, 26, ${p.opacity})`
        ctx.fill()
      })

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 110) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(255, 122, 26, ${0.08 * (1 - dist / 110)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
      animationId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const features = [
    { icon: MessageSquare, text: 'Responde a tus clientes al instante, 24/7' },
    { icon: TrendingUp, text: 'Califica leads y cierra ventas automáticamente' },
    { icon: Zap, text: 'Configura tu vendedor IA en minutos' },
  ]

  return (
    <div className="relative hidden lg:flex flex-col justify-center overflow-hidden bg-[var(--surface)] px-12">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 via-transparent to-transparent" />

      <div className="relative z-10 max-w-md">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)] shadow-[0_0_30px_rgba(255,122,26,0.4)] mb-8">
          <Bot size={28} className="text-white" />
        </div>
        <h2 className="text-3xl font-bold text-[var(--text)] leading-tight mb-4">
          Automatiza las ventas de tu negocio con IA
        </h2>
        <p className="text-[var(--muted)] mb-10">
          Crea tu vendedor IA y responde por WhatsApp como lo haría tu mejor vendedor, pero 24/7.
        </p>

        <div className="space-y-4">
          {features.map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/15">
                <Icon size={16} className="text-[var(--primary)]" />
              </div>
              <p className="text-sm text-[var(--text)]">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
