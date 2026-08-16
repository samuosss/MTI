"""add product_variant_options table
Revision ID: 94cdf1f7fb7e
Revises: 5ef7e4d6801d
Create Date: 2026-08-16 18:41:04.411612
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
# revision identifiers, used by Alembic.
revision: str = '94cdf1f7fb7e'
down_revision: Union[str, None] = '5ef7e4d6801d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None
def upgrade() -> None:
    op.create_table('product_variant_options',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('product_id', sa.Integer(), nullable=False),
    sa.Column('group_label', sa.String(length=100), nullable=False),
    sa.Column('option_label', sa.String(length=100), nullable=False),
    sa.Column('image_url', sa.String(length=500), nullable=True),
    sa.Column('position', sa.Integer(), nullable=False),
    sa.Column('is_default', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
def downgrade() -> None:
    op.drop_table('product_variant_options')