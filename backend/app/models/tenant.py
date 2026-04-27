from sqlalchemy import String, Boolean
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.models.base import Base, TimestampMixin, uuid_pk


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"

    id: Mapped[str] = uuid_pk()
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    users: Mapped[list["User"]] = relationship(back_populates="tenant")
    subscription: Mapped["Subscription | None"] = relationship(back_populates="tenant", uselist=False)
    payments: Mapped[list["Payment"]] = relationship(back_populates="tenant")
    whatsapp_numbers: Mapped[list["WhatsappNumber"]] = relationship(back_populates="tenant")
    agents: Mapped[list["VendedorAgent"]] = relationship(back_populates="tenant")
