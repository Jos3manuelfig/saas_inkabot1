from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.models.user import UserRole


class LoginRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"email": "admin@inkabot.pe", "password": "secreto"}})

    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {
        "name": "Restaurante El Inka", "email": "contacto@elinka.pe",
        "phone": "+51987654321", "password": "MiClaveSegura1!", "plan": "Emprendedor"
    }})
    name: str
    email: EmailStr
    phone: str | None = None
    password: str = Field(min_length=8)
    plan: str = "Emprendedor"


class RegisterResponse(BaseModel):
    tenant_id: str
    email: str


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
