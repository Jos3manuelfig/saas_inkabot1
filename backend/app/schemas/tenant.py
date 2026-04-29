from datetime import date
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.subscription import SubscriptionStatus
from app.models.whatsapp import WhatsappConnectionStatus


class TenantCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {
        "name": "Restaurante El Inka", "email": "contacto@elinka.pe",
        "phone": "+51987654321", "plan": "Emprendedor", "expiry_date": "2026-12-31"
    }})
    name: str
    email: EmailStr
    phone: str | None = None
    plan: str = "Emprendedor"
    expiry_date: date | None = None
    status: str = "active"


class TenantUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    is_active: bool | None = None


class SubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    plan_name: str | None = None
    start_date: date
    end_date: date
    status: SubscriptionStatus


class WhatsappOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    phone_number: str
    status: WhatsappConnectionStatus
    bot_active: bool


class TenantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    email: str
    phone: str | None
    is_active: bool
    subscription: SubscriptionOut | None = None
    whatsapp_numbers: list[WhatsappOut] = []


class TenantCreateResponse(BaseModel):
    tenant: TenantOut
    generated_password: str
    client_email: str
