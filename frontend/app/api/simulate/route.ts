import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSystemPrompt(trainingBlocks: string[]): string {
  if (!trainingBlocks.length) {
    return 'Eres un asistente de ventas amable y profesional. Responde las preguntas de los clientes de forma concisa.'
  }
  const context = trainingBlocks.join('\n\n')
  return `Eres un agente de ventas virtual. Usa TODA la siguiente información para responder a los clientes:

${context}

INSTRUCCIONES:
- Responde basándote en la información anterior.
- Si no tienes información sobre algo, dilo con amabilidad.
- Sé conciso, amigable y profesional.
- Responde en el mismo idioma que el cliente.`
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [], trainingBlocks = [] } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'message requerido' }, { status: 400 })
    }

    const systemPrompt = buildSystemPrompt(trainingBlocks)
    const messages = [
      ...history.slice(-20).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Simulate error:', error)
    return NextResponse.json({ error: 'Error al generar respuesta' }, { status: 500 })
  }
}
