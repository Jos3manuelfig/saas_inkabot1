from pydantic_settings import BaseSettings, SettingsConfigDict
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    ANTHROPIC_API_KEY: str = ""
    WEBHOOK_VERIFY_TOKEN: str = "inkabot_webhook_secret"

    # Número personal para derivar atención humana (formato: 51924940724)
    HANDOFF_PHONE: str = "51924940724"

    CORS_ORIGINS: str = '["http://localhost:3000","http://localhost:3001"]'

    @property
    def cors_origins_list(self) -> list[str]:
        return json.loads(self.CORS_ORIGINS)


settings = Settings()
