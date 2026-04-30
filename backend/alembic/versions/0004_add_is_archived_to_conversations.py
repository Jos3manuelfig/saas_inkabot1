"""add is_archived to conversations

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-29

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "conversations",
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default="false"),
    )
    # Índice para acelerar el filtrado habitual (activas por tenant)
    op.create_index(
        "ix_conversations_tenant_archived",
        "conversations",
        ["tenant_id", "is_archived"],
    )


def downgrade() -> None:
    op.drop_index("ix_conversations_tenant_archived", table_name="conversations")
    op.drop_column("conversations", "is_archived")
