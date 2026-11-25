"""add_media_type_and_vocabularies

Revision ID: 46de59b9571c
Revises: 0b66c5237167
Create Date: 2026-11-26 03:46:52.714863

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '46de59b9571c'
down_revision: Union[str, None] = '0b66c5237167'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table('articles'):
        article_cols = {col['name'] for col in inspector.get_columns('articles')}
        if 'media_type' not in article_cols:
            op.add_column(
                'articles',
                sa.Column('media_type', sa.String(), server_default='article', nullable=True),
            )

    if not inspector.has_table('vocabularies'):
        op.create_table(
            'vocabularies',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('word', sa.String(), nullable=False),
            sa.Column('definition', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_vocabularies_id'), 'vocabularies', ['id'], unique=False)
        op.create_index(op.f('ix_vocabularies_word'), 'vocabularies', ['word'], unique=False)
    else:
        existing_indexes = {idx['name'] for idx in inspector.get_indexes('vocabularies')}
        if op.f('ix_vocabularies_id') not in existing_indexes:
            op.create_index(op.f('ix_vocabularies_id'), 'vocabularies', ['id'], unique=False)
        if op.f('ix_vocabularies_word') not in existing_indexes:
            op.create_index(op.f('ix_vocabularies_word'), 'vocabularies', ['word'], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table('vocabularies'):
        existing_indexes = {idx['name'] for idx in inspector.get_indexes('vocabularies')}
        if op.f('ix_vocabularies_word') in existing_indexes:
            op.drop_index(op.f('ix_vocabularies_word'), table_name='vocabularies')
        if op.f('ix_vocabularies_id') in existing_indexes:
            op.drop_index(op.f('ix_vocabularies_id'), table_name='vocabularies')
        op.drop_table('vocabularies')

    if inspector.has_table('articles'):
        article_cols = {col['name'] for col in inspector.get_columns('articles')}
        if 'media_type' in article_cols:
            op.drop_column('articles', 'media_type')
