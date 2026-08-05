"""Settings read/write (spec §3.5).

Values are JSON-encoded on write and parsed on read, following the
stringify-on-write / parse-on-read convention the settings table inherits from
localStorage (CLAUDE.md "Settings quirk"). Breaking it would double-encode
values the moment M2 points useProfile at this API.
"""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SCHEMA_VERSION_KEY
from app.models import Setting
from app.utils import utc_now_iso

# Internal bookkeeping (see db._check_schema_version), not a user preference.
# Hidden from GET /api/settings so the frontend's settings object stays exactly
# the UserSettings shape it expects, and ignored on import so a stale value in
# an export file can't overwrite what this code stamped.
INTERNAL_KEYS = frozenset({SCHEMA_VERSION_KEY})


def _decode(raw: str) -> Any:
    """Parse a stored value, tolerating one that was written unencoded.

    A bare legacy string like `light` is not valid JSON and would otherwise
    raise. Returning it as-is is strictly better than failing the whole
    GET /api/settings request over one malformed row.
    """
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw


def get_all_settings(db: Session) -> dict[str, Any]:
    """Every user-facing setting, values already parsed -- matching what
    getAllSettings() returns today, e.g. {"height": 180}."""
    rows = db.scalars(select(Setting)).all()
    return {row.key: _decode(row.value) for row in rows if row.key not in INTERNAL_KEYS}


def set_setting(db: Session, key: str, value: Any) -> Any:
    """Upsert one setting, JSON-encoding the value. Returns the parsed value."""
    encoded = json.dumps(value)
    existing = db.get(Setting, key)
    if existing is None:
        db.add(Setting(key=key, value=encoded, updated_at=utc_now_iso()))
    else:
        existing.value = encoded
        existing.updated_at = utc_now_iso()
    db.commit()
    return value
