import anthropic
from app.core.config import settings

# Modelo rápido y económico para producción según CLAUDE.md
PRODUCTION_MODEL = "claude-haiku-4-5-20251001"

DEFAULT_SYSTEM_PROMPT = (
    "Eres un asistente de ventas amable y profesional. "
    "Responde las preguntas de los clientes de forma concisa y útil."
)


class AnthropicService:
    """Servicio para generar respuestas del bot usando la API de Anthropic."""

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    def _build_system_prompt(
        self, agent_system_prompt: str | None, training_blocks: list[str]
    ) -> str:
        """Construye el system prompt final combinando el prompt del agente
        con los bloques de entrenamiento acumulados."""
        parts: list[str] = []

        if agent_system_prompt:
            parts.append(agent_system_prompt)

        if training_blocks:
            context = "\n\n".join(f"- {block}" for block in training_blocks)
            parts.append(f"INFORMACIÓN DE TU NEGOCIO:\n{context}")

        if not parts:
            return DEFAULT_SYSTEM_PROMPT

        parts.append(
            "\nINSTRUCCIONES:\n"
            "- Responde siempre basándote en la información anterior.\n"
            "- Si no tienes información sobre algo, dilo con amabilidad.\n"
            "- Sé conciso, amigable y profesional.\n"
            "- Responde en el mismo idioma que el cliente."
        )
        return "\n\n".join(parts)

    async def generate_reply(
        self,
        user_message: str,
        history: list[dict],          # [{"role": "user"|"assistant", "content": str}]
        agent_system_prompt: str | None = None,
        training_blocks: list[str] | None = None,
    ) -> str:
        """Llama a Claude y devuelve la respuesta en texto.
        Usa los últimos 20 mensajes del historial."""

        system = self._build_system_prompt(
            agent_system_prompt, training_blocks or []
        )

        # Tomar solo los últimos 20 mensajes para no exceder el contexto
        recent_history = history[-20:] if len(history) > 20 else history
        messages = [*recent_history, {"role": "user", "content": user_message}]

        response = self.client.messages.create(
            model=PRODUCTION_MODEL,
            max_tokens=1024,
            system=system,
            messages=messages,
        )
        return response.content[0].text
