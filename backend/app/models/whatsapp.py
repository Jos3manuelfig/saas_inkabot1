import enum
from sqlalchemy import String, ForeignKey, Enum, Boolean
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.models.base import Base, TimestampMixin, uuid_pk


class WhatsappConnectionStatus(str, enum.Enum):
    connected = "connected"
    disconnected = "disconnected"
    pending = "pending"


class WhatsappNumber(Base, TimestampMixin):
    __tablename__ = "whatsapp_numbers"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[WhatsappConnectionStatus] = mapped_column(
        Enum(WhatsappConnectionStatus),
        default=WhatsappConnectionStatus.disconnected,
        nullable=False,
    )
    ycloud_phone_id: Mapped[str | None] = mapped_column(String(100))
    bot_active: Mapped[bool] = mapped_column(Boolean, default=False)

    tenant: Mapped["Tenant"] = relationship(back_populates="whatsapp_numbers")
