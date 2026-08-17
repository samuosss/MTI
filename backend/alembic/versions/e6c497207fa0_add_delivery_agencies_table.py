"""add delivery_agencies table

Revision ID: e6c497207fa0
Revises: 94cdf1f7fb7e
Create Date: 2026-08-16 18:55:33.104168

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e6c497207fa0'
down_revision: Union[str, None] = '94cdf1f7fb7e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Only drop the constraint if it actually exists on this database —
    # it was present in dev but never created on production.
    exists = conn.execute(sa.text(
        "SELECT 1 FROM pg_constraint "
        "WHERE conname = 'quote_requests_order_number_key' "
        "AND conrelid = 'quote_requests'::regclass"
    )).scalar()
    if exists:
        op.drop_constraint('quote_requests_order_number_key', 'quote_requests', type_='unique')

    # Only create the index if it doesn't already exist (idempotent).
    index_exists = conn.execute(sa.text(
        "SELECT 1 FROM pg_indexes "
        "WHERE indexname = 'ix_quote_requests_order_number' "
        "AND tablename = 'quote_requests'"
    )).scalar()
    if not index_exists:
        op.create_index(op.f('ix_quote_requests_order_number'), 'quote_requests', ['order_number'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_quote_requests_order_number'), table_name='quote_requests')
    op.create_unique_constraint('quote_requests_order_number_key', 'quote_requests', ['order_number'])
