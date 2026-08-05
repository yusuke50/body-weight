"""Record CRUD (spec §3.1-§3.4). Port of the query helpers in dataService.ts."""

from __future__ import annotations

from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errors import DuplicateRecordError, NotFoundError, ValidationError
from app.models import Record
from app.schemas import RecordCreate, RecordUpdate
from app.utils import utc_now_iso


def _existing_at_date(db: Session, date: str) -> dict | None:
    """The three identifying fields of whatever already occupies `date`, for the
    409 body in §3.2. Returns None if the row vanished between the failed insert
    and this lookup."""
    row = db.execute(
        select(Record.id, Record.date, Record.weight).where(Record.date == date)
    ).first()
    if row is None:
        return None
    return {"id": row.id, "date": row.date, "weight": row.weight}


def list_records(
    db: Session,
    *,
    start: str | None = None,
    end: str | None = None,
    order: Literal["asc", "desc"] = "desc",
    limit: int = 200,
    offset: int = 0,
) -> tuple[list[Record], int]:
    """Paginated list plus the unpaginated total (§3.1).

    Range bounds are inclusive and compared as plain strings -- valid because
    'YYYY-MM-DDTHH:mm' sorts lexicographically in chronological order, the same
    assumption getRecordsByDateRange makes in the frontend today.
    """
    filters = []
    if start:
        filters.append(Record.date >= start)
    if end:
        filters.append(Record.date <= end)

    # Count before applying limit/offset so `total` describes the whole filtered
    # set rather than the current page.
    total = db.scalar(select(func.count()).select_from(Record).where(*filters)) or 0

    ordering = Record.date.asc() if order == "asc" else Record.date.desc()
    items = list(
        db.scalars(
            select(Record).where(*filters).order_by(ordering).limit(limit).offset(offset)
        ).all()
    )
    return items, total


def get_record(db: Session, record_id: int) -> Record:
    """Single record (§3.5), or 404."""
    record = db.get(Record, record_id)
    if record is None:
        raise NotFoundError(f"No record with id {record_id}.")
    return record


def create_record(db: Session, payload: RecordCreate) -> Record:
    """Create (§3.2). 409 if `date` is taken, regardless of weight."""
    now = utc_now_iso()
    record = Record(
        **payload.model_dump(),
        created_at=now,
        updated_at=now,
    )
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        # Catch the UNIQUE(date) violation and translate it, rather than
        # pre-checking with a SELECT -- a pre-check is a race, however unlikely
        # at this scale, and the DB already knows the answer.
        db.rollback()
        existing = _existing_at_date(db, payload.date)
        if existing is not None:
            raise DuplicateRecordError(existing) from None
        # Some other constraint failed: the CHECKs in models.py are the last line
        # of defence and should already have been caught by Pydantic, so landing
        # here means the two have drifted apart.
        raise ValidationError("Record violates a database constraint.") from None
    return record


def update_record(db: Session, record_id: int, payload: RecordUpdate) -> Record:
    """Partial update (§3.3). Omitted keys untouched, explicit null clears."""
    record = get_record(db, record_id)

    # exclude_unset is the whole mechanism: it yields only the keys the client
    # actually sent, so `{"weight": 56.9}` leaves body_fat_percentage alone while
    # `{"body_fat_percentage": null}` clears it.
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(record, field, value)

    # Checked against the POST-MERGE row, not the payload: patching `weight`
    # alone can invalidate a `muscle_mass` that was already stored, and patching
    # `muscle_mass` alone has to compare against the stored `weight`.
    if record.muscle_mass is not None and record.muscle_mass > record.weight:
        db.rollback()
        raise ValidationError(
            "muscle_mass cannot exceed weight",
            details=[{"field": "muscle_mass", "message": "cannot exceed weight"}],
        )

    record.updated_at = utc_now_iso()

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # A payload carrying `date` hits the same UNIQUE index as create.
        if "date" in changes:
            existing = _existing_at_date(db, changes["date"])
            if existing is not None:
                raise DuplicateRecordError(existing) from None
        raise ValidationError("Record violates a database constraint.") from None
    return record


def delete_record(db: Session, record_id: int) -> None:
    """Hard delete (§3.4) -- no soft-delete column, matching current behaviour."""
    record = get_record(db, record_id)
    db.delete(record)
    db.commit()
