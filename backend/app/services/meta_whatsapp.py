import httpx
from dataclasses import dataclass

GRAPH_URL = "https://graph.facebook.com/v19.0"


@dataclass
class IncomingMessage:
    """Mensaje entrante parseado desde el payload del webhook de Meta."""
    phone_number_id: str   # ID del número de negocio que recibió el mensaje
    from_phone: str        # Número del usuario final
    message_id: str
    text: str
    timestamp: str


class MetaWhatsAppService:
    """Servicio para interactuar con la API de Meta WhatsApp Business.
    Cada instancia usa el access_token del número de negocio correspondiente."""

    def __init__(self, phone_number_id: str, access_token: str):
        self.phone_number_id = phone_number_id
        self.access_token = access_token
        self._headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

    async def send_text_message(self, to: str, text: str) -> dict:
        """Envía un mensaje de texto al usuario final."""
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {"preview_url": False, "body": text},
        }
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                f"{GRAPH_URL}/{self.phone_number_id}/messages",
                headers=self._headers,
                json=payload,
            )
            response.raise_for_status()
            return response.json()

    async def mark_as_read(self, message_id: str) -> None:
        """Marca un mensaje como leído (muestra los dos checks azules)."""
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                f"{GRAPH_URL}/{self.phone_number_id}/messages",
                headers=self._headers,
                json={"messaging_product": "whatsapp", "status": "read", "message_id": message_id},
            )

    @staticmethod
    def parse_webhook_payload(payload: dict) -> list[IncomingMessage]:
        """Extrae los mensajes de texto del payload del webhook de Meta.
        Ignora mensajes de tipo multimedia, reacciones, etc."""
        messages: list[IncomingMessage] = []

        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                phone_number_id = value.get("metadata", {}).get("phone_number_id", "")

                for msg in value.get("messages", []):
                    if msg.get("type") != "text":
                        continue
                    messages.append(
                        IncomingMessage(
                            phone_number_id=phone_number_id,
                            from_phone=msg["from"],
                            message_id=msg["id"],
                            text=msg["text"]["body"],
                            timestamp=msg.get("timestamp", ""),
                        )
                    )
        return messages
