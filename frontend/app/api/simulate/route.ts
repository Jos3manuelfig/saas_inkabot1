// SECURITY: Este archivo es un Server-side API Route de Next.js.
// La API key de Anthropic se lee de process.env (servidor) y NUNCA llega al browser.
// NO usar NEXT_PUBLIC_ANTHROPIC_API_KEY — eso la expondría al cliente.
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

function buildSystemPrompt(trainingBlocks: string[], agentPrompt?: string): string {
  const parts: string[] = []
  if (agentPrompt?.trim()) parts.push(agentPrompt.trim())
  if (trainingBlocks.length) parts.push(`INFORMACIÓN DE ENTRENAMIENTO:\n${trainingBlocks.join('\n\n')}`)

  if (!parts.length) {
    return 'Eres un asistente de ventas amable y profesional. Responde las preguntas de los clientes de forma concisa.'
  }

  parts.push(
    'INSTRUCCIONES:\n' +
      '- Responde basándote en la información anterior.\n' +
      '- Si no tienes información sobre algo, dilo con amabilidad.\n' +
      '- Sé conciso, amigable y profesional.\n' +
      '- Responde en el mismo idioma que el cliente.'
  )
  return parts.join('\n\n')
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    console.error('[simulate] ANTHROPIC_API_KEY no está configurada en las variables de entorno')
    return NextResponse.json(
      { error: 'Clave de API de Anthropic no configurada. Agrega ANTHROPIC_API_KEY en las variables de entorno.' },
      { status: 500 }
    )
  }

  try {
    const body = await req.json()
    const { message, history = [], trainingBlocks = [], agentPrompt = '' } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message requerido' }, { status: 400 })
    }

    const client = new Anthropic({ apiKey })

    const systemPrompt = buildSystemPrompt(trainingBlocks, agentPrompt)
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history.slice(-20).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ reply })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[simulate] Error al llamar a Anthropic:', msg)
    return NextResponse.json(
      { error: `Error al generar respuesta: ${msg}` },
      { status: 500 }
    )
  }
}
