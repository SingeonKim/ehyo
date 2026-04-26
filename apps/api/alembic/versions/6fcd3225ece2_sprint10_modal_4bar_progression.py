"""sprint10_modal_4bar_progression

modal 3장(dorian-vamp/lydian-vamp/mixolydian-vamp) 마디수를 2 → 4로 늘리고
progression JSON도 4마디 진행으로 갱신. Sprint 10 Card domain audit.

Revision ID: 6fcd3225ece2
Revises: 9e66e712dd72
Create Date: 2026-04-26 19:56:26.918365
"""
from typing import Sequence, Union

from alembic import op
import json


# revision identifiers, used by Alembic.
revision: str = '6fcd3225ece2'  # do not change
down_revision: Union[str, Sequence[str], None] = '9e66e712dd72'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# upgrade 후 진행
NEW_PROGRESSIONS = {
    'dorian-vamp': [
        {"bar": 1, "chord": "i"},
        {"bar": 2, "chord": "IV"},
        {"bar": 3, "chord": "i"},
        {"bar": 4, "chord": "bVII"},
    ],
    'lydian-vamp': [
        {"bar": 1, "chord": "I"},
        {"bar": 2, "chord": "II"},
        {"bar": 3, "chord": "I"},
        {"bar": 4, "chord": "II"},
    ],
    'mixolydian-vamp': [
        {"bar": 1, "chord": "I"},
        {"bar": 2, "chord": "bVII"},
        {"bar": 3, "chord": "I"},
        {"bar": 4, "chord": "bVII"},
    ],
}

# downgrade 시 회귀 진행 (Sprint 9까지의 2bar)
OLD_PROGRESSIONS = {
    'dorian-vamp': [
        {"bar": 1, "chord": "i"},
        {"bar": 2, "chord": "IV"},
    ],
    'lydian-vamp': [
        {"bar": 1, "chord": "I"},
        {"bar": 2, "chord": "II"},
    ],
    'mixolydian-vamp': [
        {"bar": 1, "chord": "I"},
        {"bar": 2, "chord": "bVII"},
    ],
}


def upgrade() -> None:
    """modal 3장 bars=2 → 4, progression 4마디로 갱신."""
    for slug, progression in NEW_PROGRESSIONS.items():
        op.execute(
            f"""
            UPDATE progression_templates
            SET bars = 4,
                progression = '{json.dumps(progression)}'::jsonb
            WHERE slug = '{slug}';
            """
        )


def downgrade() -> None:
    """modal 3장 bars=4 → 2 회귀."""
    for slug, progression in OLD_PROGRESSIONS.items():
        op.execute(
            f"""
            UPDATE progression_templates
            SET bars = 2,
                progression = '{json.dumps(progression)}'::jsonb
            WHERE slug = '{slug}';
            """
        )
