from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.user import UserRole


class LoginRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"email": "admin@inkabot.pe", "password": "secreto"}})

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: UserRole
    tenant_id: str | None
    is_active: bool
