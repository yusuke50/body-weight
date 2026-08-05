"""Import an export file (spec §4). Shared by the CLI (§4.1) and POST /api/import (§4.2).

A port of `importFromJSON` in src/services/exportService.ts, with its two known
bugs fixed: `created_at` is preserved rather than overwritten (§4 rule 3), and
`settings` are imported rather than silently dropped (§4 rule 6).
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Literal

from sqlalchemy import select
# The SQLite dialect's insert() is what exposes ON CONFLICT. The Postgres
# variant (§5) has the same construct under sqlalchemy.dialects.postgresql, so
# this import is the one place that port would touch.
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.errors import InvalidDataFormatError
from app.models import Record, Setting
from app.services.settings import INTERNAL_KEYS
from app.utils import normalize_date, utc_now_iso

Strategy = Literal["skip", "overwrite"]

# The value columns an incoming row may carry. `id` is absent deliberately --
# §4 rule 2: incoming ids are ignored, the DB owns them.
VALUE_FIELDS = (
    "date",
    "weight",
    "body_fat_percentage",
    "water_percentage",
    "muscle_mass",
    "notes",
)


@dataclass
class ImportReport:
    """Counts for both consumers.

    `ImportResult` in src/types/index.ts only exposes imported/skipped/errors,
    but the §4.1 dry-run report needs the duplicates split by *kind* -- the two
    mean different things and only one of them is suspicious. So the raw
    outcomes are tracked separately and the frontend-facing numbers are derived.
    """

    rows_read: int = 0
    inserted: int = 0  # genuinely new rows
    same_row: int = 0  # step-1 hits: (created_at, date) matched -> literally the same row
    same_slot: int = 0  # step-2 hits: date collided -> same minute, different row
    errors: int = 0
    error_messages: list[str] = field(default_factory=list)
    settings_imported: int = 0
    strategy: Strategy = "skip"
    dry_run: bool = False

    @property
    def imported(self) -> int:
        """Under `skip` only fresh inserts count; under `overwrite` the
        duplicates were genuinely written to as well (§6-3)."""
        if self.strategy == "overwrite":
            return self.inserted + self.same_row + self.same_slot
        return self.inserted

    @property
    def skipped(self) -> int:
        return 0 if self.strategy == "overwrite" else self.same_row + self.same_slot


def _present_values(row: dict[str, Any]) -> dict[str, Any]:
    """The value columns this row actually carries.

    Two rules folded together (§4 rule 5):

    * Keys absent from the row are absent here, so a DO UPDATE built from this
      dict cannot blank a column the export simply omitted -- the failure mode
      §4 calls out explicitly ("an export missing notes will erase the notes you
      have").
    * An explicit `null` is treated as absent too. §1 notes the frontend writes
      absent/undefined and never null, so a null carries no intent to clear, and
      an import erasing data would be the worse reading of an ambiguous value.
      (This differs from PATCH, where an explicit null DOES clear -- there the
      client is stating intent.)
    """
    return {name: row[name] for name in VALUE_FIELDS if row.get(name) is not None}


def import_export_file(
    db: Session,
    payload: Any,
    *,
    strategy: Strategy = "skip",
    dry_run: bool = False,
) -> ImportReport:
    """Import one export file. All-or-nothing (§4 rule 7)."""
    # Rule 1: validate the envelope before touching the DB.
    if not isinstance(payload, dict):
        raise InvalidDataFormatError("invalid data format: expected a JSON object")
    if "version" not in payload:
        raise InvalidDataFormatError("invalid data format: missing 'version'")
    records = payload.get("records")
    if not isinstance(records, list):
        raise InvalidDataFormatError("invalid data format: 'records' must be an array")

    report = ImportReport(strategy=strategy, dry_run=dry_run)
    report.rows_read = len(records)

    # Rule 2: sort by created_at ascending, rows without one last. This is what
    # makes a one-time two-device merge come out with ids in creation order --
    # device B's older row gets id 1 even though device A's export listed its own
    # row as id 1. Nothing is renumbered after insert (§2).
    ordered = sorted(
        (row for row in records if isinstance(row, dict)),
        key=lambda row: (row.get("created_at") is None, row.get("created_at") or ""),
    )
    # Non-dict entries never reach the loop, so count them as errors here.
    for bad in (row for row in records if not isinstance(row, dict)):
        report.errors += 1
        report.error_messages.append(f"record is not an object: {json.dumps(bad)[:120]}")

    try:
        for row in ordered:
            _import_row(db, row, strategy=strategy, report=report)

        _import_settings(db, payload.get("settings"), report=report)

        if dry_run:
            # Everything above ran for real against the DB, which is what makes
            # the counts trustworthy (ON CONFLICT outcomes are only knowable by
            # letting the index decide). Rolling back is what makes it a dry run.
            db.rollback()
        else:
            # Rule 7: one commit for the whole file, so a failure halfway
            # through can't leave a half-migrated DB. (Today's importFromJSON
            # writes row by row.)
            db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise

    return report


def _import_row(db: Session, row: dict[str, Any], *, strategy: Strategy, report: ImportReport) -> None:
    """Import one record row, per §4 rules 3-5."""
    # Rule 4: skip rows missing date or weight. `not weight` also rejects a
    # weight of 0, matching the current code -- fine, since 0 is invalid anyway.
    raw_date = row.get("date")
    if not raw_date or not row.get("weight"):
        report.errors += 1
        report.error_messages.append(
            f"record is missing required fields: {json.dumps(row, ensure_ascii=False)[:200]}"
        )
        return

    date = normalize_date(raw_date)
    if date is None:
        report.errors += 1
        report.error_messages.append(f"record has an unparseable date: {raw_date!r}")
        return

    values = _present_values(row)
    values["date"] = date  # use the normalized form, not the raw string

    # Rule 3: preserve incoming created_at, else stamp now. Preserving it is what
    # makes it usable as the row-identity key at all -- the old importer
    # overwrote it, which is why that key was worthless before (§2).
    #
    # The two are kept apart on purpose: step 1 may only match on a created_at
    # the FILE supplied. Matching on one we just stamped ourselves would be
    # meaningless (it is a fresh instant and can never match an existing row),
    # and reading a hit into it would be a bug waiting to happen.
    incoming_created_at = row.get("created_at") or None
    created_at = incoming_created_at or utc_now_iso()

    # A SAVEPOINT per row. Without it, one row tripping a CHECK constraint would
    # poison the file-wide transaction and lose every valid row with it; with it,
    # the bad row rolls back alone, gets counted as an error, and rule 7's
    # all-or-nothing commit still holds for everything that did validate.
    try:
        with db.begin_nested():
            if _try_match_same_row(
                db, date, incoming_created_at, values, strategy=strategy, report=report
            ):
                return
            _insert_or_resolve_conflict(db, date, created_at, values, strategy=strategy, report=report)
    except SQLAlchemyError as exc:
        report.errors += 1
        report.error_messages.append(f"record at {date} rejected by the database: {exc.__class__.__name__}")


def _try_match_same_row(
    db: Session,
    date: str,
    incoming_created_at: str | None,
    values: dict[str, Any],
    *,
    strategy: Strategy,
    report: ImportReport,
) -> bool:
    """Step 1 of §4 rule 5 -- "is this the same ROW I already have?"

    Matched on (created_at, date) together rather than created_at alone: §2
    explains how the old importer could stamp identical created_at on rows
    written in the same millisecond, and adding date disambiguates those at no
    cost. A hit means this is literally the same row arriving again.

    Returns True if the row was handled here.
    """
    # No created_at in the file means there is nothing to match on; fall through
    # to step 2, which asks the different question.
    if incoming_created_at is None:
        return False

    existing = db.scalar(
        select(Record).where(Record.created_at == incoming_created_at, Record.date == date)
    )
    if existing is None:
        return False

    report.same_row += 1
    if strategy == "overwrite":
        for name, value in values.items():
            setattr(existing, name, value)
        existing.updated_at = utc_now_iso()
        db.flush()
    return True


def _insert_or_resolve_conflict(
    db: Session,
    date: str,
    created_at: str,
    values: dict[str, Any],
    *,
    strategy: Strategy,
    report: ImportReport,
) -> None:
    """Step 2 of §4 rule 5 -- "is the SLOT taken?"

    No created_at, or no step-1 match, means this may still be the same
    *measurement* arriving from another device (two devices produce two
    different creation instants for one measurement, which is precisely why
    created_at cannot answer this). Let the UNIQUE(date) index decide.
    """
    insert_values = {
        **values,
        "created_at": created_at,
        "updated_at": created_at,  # rule 3: updated_at == created_at on insert
    }

    if strategy == "skip":
        stmt = sqlite_insert(Record).values(**insert_values).on_conflict_do_nothing(
            index_elements=["date"]
        )
        result = db.execute(stmt)
        # rowcount 0 means the conflict clause swallowed the insert: the slot was
        # already taken by a different row.
        if result.rowcount == 0:
            report.same_slot += 1
        else:
            report.inserted += 1
        return

    # overwrite: genuinely overwrites (§6-3), replacing today's
    # declared-but-never-implemented no-op.
    #
    # DO UPDATE reports rowcount 1 whether it inserted or updated, so the
    # insert/update split needs a lookup. A pre-check SELECT is safe *here*,
    # unlike in the create path (§3.2), because the whole file runs inside one
    # transaction -- nothing else can claim the slot mid-import.
    already_present = db.scalar(select(Record.id).where(Record.date == date)) is not None

    # The SET clause excludes `date` (it is the conflict target), `id` and
    # `created_at` -- the existing row keeps its identity and its original
    # creation instant. Built from present keys only, so an omitted field is left
    # alone rather than blanked.
    update_set = {name: value for name, value in values.items() if name != "date"}
    update_set["updated_at"] = utc_now_iso()

    stmt = sqlite_insert(Record).values(**insert_values).on_conflict_do_update(
        index_elements=["date"], set_=update_set
    )
    db.execute(stmt)

    if already_present:
        report.same_slot += 1
    else:
        report.inserted += 1


def _import_settings(db: Session, incoming: Any, *, report: ImportReport) -> None:
    """Rule 6: import settings too, JSON-encoding each value.

    The current import path ignores `settings` entirely, so a height set on one
    device is lost on every sync -- worth fixing here.
    """
    if not isinstance(incoming, dict):
        return

    now = utc_now_iso()
    for key, value in incoming.items():
        if key in INTERNAL_KEYS:
            # Never let an export file's stale bookkeeping overwrite ours.
            continue
        encoded = json.dumps(value)
        existing = db.get(Setting, key)
        if existing is None:
            db.add(Setting(key=key, value=encoded, updated_at=now))
        else:
            existing.value = encoded
            existing.updated_at = now
        report.settings_imported += 1
    db.flush()
