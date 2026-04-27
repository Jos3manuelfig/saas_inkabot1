from sqlalchemy import String, Text, ForeignKey, Boolean
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.models.base import Base, TimestampMixin, uuid_pk


class VendedorAgent(Base, TimestampMixin):
    __tablename__ = "vendedor_agents"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # System prompt base del agente — se construye desde los training blocks
    # y se puede editar directamente desde el panel del cliente
    system_prompt: Mapped[str | None] = mapped_column(Text)

    tenant: Mapped["Tenant"] = relationship(back_populates="agents")
    training_blocks: Mapped[list["TrainingBlock"]] = relationship(
        back_populates="agent", cascade="all, delete-orphan", order_by="TrainingBlock.created_at"
    )


class TrainingBlock(Base, TimestampMixin):
    __tablename__ = "training_blocks"

    id: Mapped[str] = uuid_pk()
    agent_id: Mapped[str] = mapped_column(ForeignKey("vendedor_agents.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    agent: Mapped["VendedorAgent"] = relationship(back_populates="training_blocks")
