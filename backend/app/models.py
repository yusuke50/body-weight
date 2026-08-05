"""SQLAlchemy tables -- the single source of truth for the DDL (spec §2).

Kept in one module deliberately (§6-4): when the first real schema change
arrives, the initial Alembic revision can be generated from this rather than
reverse-engineered out of a live database.

Derived metrics (net/lean weight, body-fat weight, FFMI) are NOT columns here
and must not become columns -- they stay computed, as in src/utils/calculations.ts.
"""

from __future__ import annotations

from sqlalchemy import CheckConstraint, Float, Index, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Record(Base):
    """A single body measurement. Mirrors `BodyRecord` in src/types/index.ts."""

    __tablename__ = "records"

    # AUTOINCREMENT is load-bearing, not decoration. A bare INTEGER PRIMARY KEY
    # is a rowid alias: SQLite picks max(rowid)+1, so deleting the highest row
    # lets the next insert REUSE its id -- exactly the bug addRecord has today
    # (src/services/dataService.ts:17 does Math.max(...ids) + 1). AUTOINCREMENT
    # keeps a high-water mark in sqlite_sequence and never reuses.
    #
    # SQLAlchemy does NOT emit the AUTOINCREMENT keyword just because
    # autoincrement=True is set -- that flag only marks which column the ORM
    # treats as generated. The keyword comes from the sqlite_autoincrement
    # dialect option in __table_args__ below. Verify it in the generated DDL
    # rather than trusting it; a silent bare INTEGER PRIMARY KEY looks fine
    # until an id gets reused.
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Local naive measurement time, 'YYYY-MM-DDTHH:mm'. See app/utils.py for why
    # this is never converted to UTC.
    date: Mapped[str] = mapped_column(Text, nullable=False)

    # Float (not REAL) so the Postgres port in §5 lands on DOUBLE PRECISION
    # rather than PG's 4-byte REAL. On SQLite, FLOAT carries REAL affinity, so
    # the storage class matches the §2 DDL either way.
    weight: Mapped[float] = mapped_column(Float, nullable=False)
    body_fat_percentage: Mapped[float | None] = mapped_column(Float)
    water_percentage: Mapped[float | None] = mapped_column(Float)
    muscle_mass: Mapped[float | None] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text)

    # UTC ISO-8601 with millisecond precision, e.g. '2026-08-04T06:36:12.345Z'.
    created_at: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        # These CHECKs intentionally duplicate src/utils/validators.ts so the DB
        # is the last line of defence and Pydantic is the first.
        CheckConstraint("weight > 0 AND weight < 500", name="ck_records_weight"),
        CheckConstraint(
            "body_fat_percentage IS NULL "
            "OR (body_fat_percentage >= 0 AND body_fat_percentage <= 100)",
            name="ck_records_body_fat_percentage",
        ),
        CheckConstraint(
            "water_percentage IS NULL "
            "OR (water_percentage >= 0 AND water_percentage <= 100)",
            name="ck_records_water_percentage",
        ),
        CheckConstraint(
            "muscle_mass IS NULL OR (muscle_mass > 0 AND muscle_mass <= weight)",
            name="ck_records_muscle_mass",
        ),
        # The domain key (§6-1): one measurement per minute, DB-enforced. Being
        # UNIQUE also serves the "by measurement time" read paths (newest-first
        # list, range filter), so no separate non-unique index on date is needed.
        Index("idx_records_date", "date", unique=True),
        # Row-identity lookup for the importer (§4 rule 5 step 1). Deliberately
        # NOT unique: the old importFromJSON stamps its own created_at, so rows
        # written in the same millisecond share a value and a UNIQUE constraint
        # here could reject data you already have.
        Index("idx_records_created_at", "created_at"),
        # Emits the AUTOINCREMENT keyword. Must be the last element of the
        # tuple -- SQLAlchemy expects dialect kwargs there.
        {"sqlite_autoincrement": True},
    )


class Setting(Base):
    """key -> JSON-encoded value. Mirrors the `bodyweight_settings` blob."""

    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(Text, primary_key=True)

    # JSON-encoded, following the existing stringify-on-write / parse-on-read
    # convention (CLAUDE.md "Settings quirk"). Storing 180 as the string "180"
    # looks redundant for a number, but keeping the convention is what stops
    # values double-encoding when the frontend is wired up in M2.
    value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[str] = mapped_column(Text, nullable=False)
