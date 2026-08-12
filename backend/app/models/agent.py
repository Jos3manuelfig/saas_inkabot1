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
    # Agente que responde por WhatsApp — solo uno por tenant puede ser default
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    system_prompt: Mapped[str | None] = mapped_column(Text)

    # Personalidad (paso "Personalidad" del wizard de configuración)
    gender: Mapped[str | None] = mapped_column(String(20))       # Femenino / Masculino / Neutro
    tone: Mapped[str | None] = mapped_column(String(30))         # Neutral / Amigable / Profesional / Directo / Motivador
    formality: Mapped[str | None] = mapped_column(String(20))    # Formal / Casual

    # Contexto de negocio adicional (pasos "Pagos" y "Envíos" del wizard)
    payment_info: Mapped[str | None] = mapped_column(Text)
    shipping_info: Mapped[str | None] = mapped_column(Text)

    tenant: Mapped["Tenant"] = relationship(back_populates="agents")
    training_blocks: Mapped[list["TrainingBlock"]] = relationship(
        back_populates="agent", cascade="all, delete-orphan", order_by="TrainingBlock.created_at"
    )

    @property
    def effective_system_prompt(self) -> str | None:
        """Combina el system_prompt base con los campos de personalidad y
        contexto de pagos/envíos configurados en el wizard del cliente."""
        parts: list[str] = []
        if self.system_prompt:
            parts.append(self.system_prompt)

        personality_bits = []
        if self.gender:
            personality_bits.append(f"género {self.gender.lower()}")
        if self.tone:
            personality_bits.append(f"tono {self.tone.lower()}")
        if self.formality:
            personality_bits.append(f"trato {self.formality.lower()}")
        if personality_bits:
            parts.append(f"Te llamas {self.name}. Tu personalidad: {', '.join(personality_bits)}.")

        if self.payment_info:
            parts.append(f"MÉTODOS DE PAGO ACEPTADOS:\n{self.payment_info}")
        if self.shipping_info:
            parts.append(f"ENVÍOS:\n{self.shipping_info}")

        return "\n\n".join(parts) if parts else None


class TrainingBlock(Base, TimestampMixin):
    __tablename__ = "training_blocks"

    id: Mapped[str] = uuid_pk()
    agent_id: Mapped[str] = mapped_column(ForeignKey("vendedor_agents.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    agent: Mapped["VendedorAgent"] = relationship(back_populates="training_blocks")
