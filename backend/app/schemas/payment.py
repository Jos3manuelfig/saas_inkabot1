from datetime import date
from pydantic import BaseModel, ConfigDict
from app.models.payment import PaymentStatus, PaymentMethod


class PaymentCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"tenant_id": "uuid", "amount": 150.00, "payment_date": "2026-04-26", "method": "Yape", "plan_name": "Profesional"}})

    tenant_id: str
    amount: float
    payment_date: date
    method: PaymentMethod
    plan_name: str
    status: PaymentStatus = PaymentStatus.paid
    notes: str | None = None


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tenant_id: str
    amount: float
    payment_date: date
    method: PaymentMethod
    plan_name: str
    status: PaymentStatus
    notes: str | None
