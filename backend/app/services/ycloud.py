import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.models.whatsapp import WhatsappNumber, WhatsappConnectionStatus


class YCloudService:
    def __init__(self):
        self.api_key = settings.YCLOUD_API_KEY
        self.base_url = settings.YCLOUD_BASE_URL

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def get_phone_numbers(self) -> list[dict]:
        """Obtiene los números registrados en YCloud."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/whatsapp/phone-numbers",
                headers={"X-API-Key": self.api_key},
                timeout=10,
            )
            response.raise_for_status()
            return response.json().get("items", [])

    async def sync_status(
        self, numbers: list[WhatsappNumber], db: AsyncSession
    ) -> list[WhatsappNumber]:
        """Sincroniza el estado de conexión con YCloud."""
        try:
            ycloud_numbers = await self.get_phone_numbers()
            ycloud_map = {n["phoneNumber"]: n for n in ycloud_numbers}

            for number in numbers:
                ycloud_data = ycloud_map.get(number.phone_number)
                if ycloud_data:
                    connected = ycloud_data.get("status") == "CONNECTED"
                    number.status = (
                        WhatsappConnectionStatus.connected
                        if connected
                        else WhatsappConnectionStatus.disconnected
                    )
                    number.ycloud_phone_id = ycloud_data.get("id")
        except Exception:
            # Si YCloud falla, devolvemos el estado guardado sin modificar
            pass

        return numbers
