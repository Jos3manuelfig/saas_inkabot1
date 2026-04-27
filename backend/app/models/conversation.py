import enum
from sqlalchemy import String, ForeignKey, Boolean, Text, Enum, DateTime, func
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.models.base import Base, TimestampMixin, uuid_pk


class MessageRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"


class Conversation(Base, TimestampMixin):
    """Una conversación activa entre un usuario final y el bot de un tenant."""
    __tablename__ = "conversations"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    whatsapp_number_id: Mapped[str] = mapped_column(ForeignKey("whatsapp_numbers.id"), nullable=False)
    # Número de teléfono del usuario final (quien escribe al bot)
    user_phone: Mapped[str] = mapped_column(String(30), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_message_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )


class Message(Base):
    """Mensaje individual dentro de una conversación."""
    __tablename__ = "messages"

    id: Mapped[str] = uuid_pk()
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"), nullable=False)
    role: Mapped[MessageRole] = mapped_column(Enum(MessageRole), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
