"""Timestamp helpers.

The two time formats in this codebase are not interchangeable and mixing them
is the single easiest way to corrupt data here (docs/backend-spec.md §1):

  * `date`       -- LOCAL NAIVE, minute precision, 'YYYY-MM-DDTHH:mm'.
                    Comes from a browser `datetime-local` input. Never convert
                    it to UTC: that would shift every existing record.
  * `created_at` -- UTC, millisecond precision, 'Z' suffix.
"""

from __future__ import annotations

from datetime import datetime, timezone

# `date` column format. Lexicographic order == chronological order for this
# shape, which is what lets range filters and ORDER BY use plain string
# comparison (same trick getRecordsByDateRange uses in the frontend today).
DATE_FORMAT = "%Y-%m-%dT%H:%M"
DATE_LENGTH = 16  # len('2026-08-04T07:30')


def utc_now_iso() -> str:
    """UTC timestamp in the exact shape JS `Date.prototype.toISOString()` emits.

    Matching JS byte-for-byte is load-bearing, not cosmetic: the importer's
    row-identity check is a string equality test on `created_at` (§4 rule 5
    step 1), comparing values the old localStorage frontend wrote against ones
    this API writes. `datetime.isoformat()` would emit '+00:00' and microsecond
    precision, and neither would ever match.
    """
    now = datetime.now(timezone.utc)
    return f"{now:%Y-%m-%dT%H:%M:%S}.{now.microsecond // 1000:03d}Z"


def local_now_date() -> str:
    """Current local wall-clock time in `date` column format.

    Local, not UTC, because `date` values are local-naive and comparing them
    against a UTC "now" would let a user in UTC+8 be blocked from recording
    this morning's weight. Note this reads the *server's* timezone -- correct
    for the localhost single-user setup M1 targets, and something a future
    multi-timezone deployment would have to revisit.
    """
    return datetime.now().strftime(DATE_FORMAT)


def is_valid_date(value: str) -> bool:
    """Port of `isValidDate` in src/utils/validators.ts: must parse, and must
    not be in the future. The future check is a plain string comparison, valid
    because of the lexicographic property noted on DATE_FORMAT above."""
    try:
        datetime.strptime(value, DATE_FORMAT)
    except ValueError:
        return False
    return value <= local_now_date()


def normalize_date(value: str) -> str | None:
    """Coerce an incoming `date` to minute precision, or return None if it is
    not a usable timestamp at all.

    Exports should already be minute-precision, but a value carrying seconds
    ('2026-07-30T08:15:00') unambiguously denotes the same measurement minute,
    and rejecting the whole row over a formatting detail would fail a migration
    for no reason. Truncating rather than accepting the longer string also
    protects the UNIQUE(date) index, whose "one measurement per minute" meaning
    depends on every stored value having exactly this precision.
    """
    if not isinstance(value, str):
        return None
    candidate = value.strip()[:DATE_LENGTH]
    try:
        datetime.strptime(candidate, DATE_FORMAT)
    except ValueError:
        return None
    return candidate
