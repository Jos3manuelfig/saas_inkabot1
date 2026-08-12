"""add agent personality, payment and shipping fields

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-09

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("vendedor_agents", sa.Column("gender", sa.String(length=20), nullable=True))
    op.add_column("vendedor_agents", sa.Column("tone", sa.String(length=30), nullable=True))
    op.add_column("vendedor_agents", sa.Column("formality", sa.String(length=20), nullable=True))
    op.add_column("vendedor_agents", sa.Column("payment_info", sa.Text(), nullable=True))
    op.add_column("vendedor_agents", sa.Column("shipping_info", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("vendedor_agents", "shipping_info")
    op.drop_column("vendedor_agents", "payment_info")
    op.drop_column("vendedor_agents", "formality")
    op.drop_column("vendedor_agents", "tone")
    op.drop_column("vendedor_agents", "gender")
