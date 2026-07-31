"""Add unique constraint to articles.original_url

Revision ID: 3a9f21b8c047
Revises: 18eb8791cf3c
Create Date: 2026-07-31 01:51:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = '3a9f21b8c047'
down_revision: Union[str, None] = '18eb8791cf3c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # First, remove duplicate URLs keeping only the most recently created article per URL
    # so the UNIQUE constraint can be applied cleanly
    conn.execute(text("""
        DELETE FROM articles
        WHERE id NOT IN (
            SELECT DISTINCT ON (original_url) id
            FROM articles
            ORDER BY original_url, created_at DESC
        )
    """))

    # Now safely add the UNIQUE constraint
    # Using IF NOT EXISTS-equivalent: check pg_constraint first
    result = conn.execute(text("""
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_articles_original_url'
        AND conrelid = 'articles'::regclass
    """))
    if not result.fetchone():
        op.create_unique_constraint(
            'uq_articles_original_url',
            'articles',
            ['original_url']
        )


def downgrade() -> None:
    op.drop_constraint('uq_articles_original_url', 'articles', type_='unique')
