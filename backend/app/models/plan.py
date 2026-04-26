import enum
from sqlalchemy import String, Integer, Numeric, Enum, Boolean
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.models.base import Base, TimestampMixin, uuid_pk


class PlanType(str, enum.Enum):
    emprendedor = "Emprendedor"
    profesional = "Profesional"


class Plan(Base, TimestampMixin):
    __tablename__ = "plans"

    id: Mapped[str] = uuid_pk()
    name: Mapped[PlanType] = mapped_column(Enum(PlanType), unique=True, nullable=False)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    max_messages_per_day: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    description: Mapped[str | None] = mapped_column(String(500))

    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="plan")
