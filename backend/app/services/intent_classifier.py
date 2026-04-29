import anthropic
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

# Palabras clave que disparan desvío a humano inmediatamente
HANDOFF_KEYWORDS = [
    "hablar con una persona", "hablar con alguien", "hablar con un humano",
    "operador", "encargado", "dueño", "persona real", "atención humana",
    "quiero hablar", "necesito hablar", "comunicarme con", "agente humano",
    "representante", "asesor humano", "me puede atender", "hay alguien",
]


def detect_handoff_keywords(text: str) -> bool:
    """Detección rápida por palabras clave antes de llamar a Claude."""
    text_lower = text.lower()
    return any(kw in text_lower for kw in HANDOFF_KEYWORDS)


class IntentClassifierService:
    """Clasifica la intención de una conversación usando Claude Haiku."""

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    def _format_messages(self, messages: list[dict]) -> str:
        lines = []
        for m in messages[-10:]:  # últimos 10 mensajes para contexto
            role = "Cliente" if m["role"] == "user" else "Bot"
            lines.append(f"{role}: {m['content']}")
        return "\n".join(lines)

    async def classify(self, messages: list[dict]) -> tuple[str, str]:
        """
        Retorna (status, intent_summary).
        status: "active" | "sale_closed" | "sale_lost" | "human_handoff"
        intent_summary: descripción breve en español
        """
        if not messages:
            return "active", ""

        # Primero revisar si el último mensaje del cliente pide humano
        last_user_msgs = [m for m in messages if m["role"] == "user"]
        if last_user_msgs and detect_handoff_keywords(last_user_msgs[-1]["content"]):
            return "human_handoff", "Cliente solicitó atención humana"

        conversation_text = self._format_messages(messages)

        try:
            response = self.client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=150,
                messages=[{
                    "role": "user",
                    "content": f"""Analiza esta conversación de WhatsApp de un negocio y clasifica su estado.

CONVERSACIÓN:
{conversation_text}

Responde en este formato exacto (solo esto, sin explicaciones):
STATUS: [sale_closed|sale_lost|human_handoff|active]
RESUMEN: [una frase breve en español describiendo qué pasó]

Criterios:
- sale_closed: cliente confirmó pedido, preguntó cómo pagar, dio dirección, dijo "lo quiero", "lo llevo", "cuánto es"
- sale_lost: cliente se despidió sin comprar, dijo "lo pienso", "después vuelvo", o dejó de responder tras ver precios
- human_handoff: cliente pidió hablar con persona, encargado, dueño u operador
- active: conversación en curso sin conclusión clara""",
                }],
            )

            text = response.content[0].text.strip()
            status = "active"
            summary = ""

            for line in text.splitlines():
                if line.startswith("STATUS:"):
                    raw = line.replace("STATUS:", "").strip().lower()
                    if raw in ("sale_closed", "sale_lost", "human_handoff", "active"):
                        status = raw
                elif line.startswith("RESUMEN:"):
                    summary = line.replace("RESUMEN:", "").strip()

            return status, summary

        except Exception as e:
            logger.error(f"Error clasificando intención: {e}")
            return "active", ""
