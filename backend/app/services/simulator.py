import anthropic
from app.core.config import settings
from app.schemas.agent import SimulatorMessage


class SimulatorService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.ANTHROPIC_MODEL

    def build_system_prompt(self, training_blocks: list[str]) -> str:
        if not training_blocks:
            return "Eres un asistente de ventas amable y profesional. Responde preguntas de clientes."

        context = "\n\n---\n\n".join(training_blocks)
        return f"""Eres un agente de ventas virtual. Usa TODA la siguiente información como base de tu conocimiento para responder a los clientes.

INFORMACIÓN DE ENTRENAMIENTO:
{context}

INSTRUCCIONES:
- Responde siempre basándote en la información de entrenamiento anterior.
- Si no tienes información sobre algo, dilo con amabilidad.
- Sé conciso, amigable y profesional.
- Responde en el mismo idioma que el cliente."""

    async def chat(
        self,
        training_blocks: list[str],
        user_message: str,
        history: list[SimulatorMessage],
    ) -> str:
        system_prompt = self.build_system_prompt(training_blocks)

        messages = [
            {"role": msg.role, "content": msg.content}
            for msg in history
            if msg.role in ("user", "assistant")
        ]
        messages.append({"role": "user", "content": user_message})

        response = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
        )
        return response.content[0].text
