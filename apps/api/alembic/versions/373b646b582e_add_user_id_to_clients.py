"""add user_id to clients

Revision ID: 373b646b582e
Revises: 07c4d981e94d
Create Date: 2026-03-15 10:45:01.216014

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '373b646b582e'
down_revision: Union[str, Sequence[str], None] = '07c4d981e94d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('clients', sa.Column('user_id', sa.String(length=36), nullable=True))
    op.create_foreign_key('fk_clients_user_id', 'clients', 'users', ['user_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_clients_user_id'), 'clients', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_clients_user_id'), table_name='clients')
    op.drop_constraint('fk_clients_user_id', 'clients', type_='foreignkey')
    op.drop_column('clients', 'user_id')
