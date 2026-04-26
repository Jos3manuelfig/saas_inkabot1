import enum
from datetime import date
from sqlalchemy import String, Date, ForeignKey, Enum, Numeric, Text
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.models.base import Base, TimestampMixin, uuid_pk


class PaymentStatus(str, enum.Enum):
    paid = "paid"
    pending = "pending"


class PaymentMethod(str, enum.Enum):
    card = "Tarjeta"
    transfer = "Transferencia"
    yape = "Yape"
    plin = "Plin"
    cash = "Efectivo"


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod), nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus), default=PaymentStatus.paid, nullable=False
    )
    plan_name: Mapped[str] = mapped_column(String(100), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    registered_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"))

    tenant: Mapped["Tenant"] = relationship(back_populates="payments")
