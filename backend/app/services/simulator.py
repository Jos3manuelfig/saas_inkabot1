import anthropic
from app.core.config import settings
from app.schemas.agent import SimulatorMessage


class SimulatorService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.ANTHROPIC_MODEL

    def build_system_prompt(self, training_blocks: list[str], agent_system_prompt: str | None = None) -> str:
        parts: list[str] = []
        if agent_system_prompt:
            parts.append(agent_system_prompt)

        if training_blocks:
            context = "\n\n---\n\n".join(training_blocks)
            parts.append(f"INFORMACIÓN DE ENTRENAMIENTO:\n{context}")

        if not parts:
            return "Eres un asistente de ventas amable y profesional. Responde preguntas de clientes."

        parts.append(
            "INSTRUCCIONES:\n"
            "- Responde siempre basándote en la información anterior.\n"
            "- Si no tienes información sobre algo, dilo con amabilidad.\n"
            "- Sé conciso, amigable y profesional.\n"
            "- Responde en el mismo idioma que el cliente."
        )
        return "\n\n".join(parts)

    async def chat(
        self,
        training_blocks: list[str],
        user_message: str,
        history: list[SimulatorMessage],
        agent_system_prompt: str | None = None,
    ) -> str:
        system_prompt = self.build_system_prompt(training_blocks, agent_system_prompt)

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
