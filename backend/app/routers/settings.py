"""Settings endpoints (spec §3.5) -- what useProfile needs in M2."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import SettingUpdate
from app.services import settings as settings_service

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
def get_settings(db: Session = Depends(get_db)) -> dict[str, Any]:
    """All settings, values already JSON-parsed -- e.g. {"height": 180}.
    Matches what getAllSettings() hands components today."""
    return settings_service.get_all_settings(db)


@router.put("/{key}")
def put_setting(
    key: str,
    payload: SettingUpdate,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Upsert one setting. Body is {"value": 178}; stored JSON-encoded.

    Returns the single key/value rather than the whole settings object, so the
    caller can tell what it just wrote without re-reading everything.
    """
    value = settings_service.set_setting(db, key, payload.value)
    return {key: value}
