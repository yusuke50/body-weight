"""Engine, session factory, PRAGMA wiring, and startup schema creation."""

from __future__ import annotations

import json
import logging
import sqlite3
from collections.abc import Iterator

from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings
from app.utils import utc_now_iso

logger = logging.getLogger(__name__)

# Bumped by hand whenever the DDL in models.py changes. See _check_schema_version.
SCHEMA_VERSION = 1
SCHEMA_VERSION_KEY = "schema_version"


class Base(DeclarativeBase):
    """Declarative base. models.py attaches the two tables from spec §2."""


# check_same_thread=False is required because FastAPI runs sync endpoints on a
# threadpool, so the thread that borrows a pooled connection is not necessarily
# the one that opened it. Safe here: the pool never lends one connection to two
# threads simultaneously.
_connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=_connect_args, future=True)

# expire_on_commit=False so a returned ORM object stays readable after commit --
# otherwise serializing it into the response would trigger a refresh SELECT on
# a session the request has already finished with.
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


@event.listens_for(engine, "connect")
def _configure_sqlite_connection(dbapi_connection, connection_record) -> None:
    """Apply the §2 PRAGMAs to EVERY pooled connection, and hand transaction
    control to SQLAlchemy.

    **PRAGMAs.** This has to be a connect-event hook, not a one-off call at
    startup. `foreign_keys` is a per-connection setting and SQLAlchemy's pool
    opens connections lazily, so setting it once at boot silently misses every
    connection opened afterwards -- the failure mode being that FK enforcement
    quietly isn't on for most requests. `journal_mode = WAL` is different: it is
    persisted in the database file header, so re-issuing it per connection is a
    cheap no-op. Keeping both here means the PRAGMA list matches §2 in one place.

    **isolation_level = None.** Python's sqlite3 driver manages transactions
    itself by default: it opens one implicitly before a DML statement and
    commits at its own discretion. That behaviour breaks SAVEPOINT, which the
    importer relies on to isolate one bad row without losing the file (§4 rules
    4 + 7) -- releasing a savepoint ends up committing, so `rollback()` has
    nothing left to undo and `--dry-run` silently writes. Setting
    isolation_level to None turns the driver's transaction handling off so
    SQLAlchemy issues BEGIN itself (see the `begin` handler below). This is the
    workaround SQLAlchemy documents for pysqlite, not a local invention.

    Doing it here also means the PRAGMAs below run outside any transaction,
    which matters for `journal_mode = WAL` -- SQLite refuses to switch journal
    mode from inside one.
    """
    if not isinstance(dbapi_connection, sqlite3.Connection):
        # The Postgres variant (§5) needs none of this -- psycopg does not have
        # pysqlite's transaction quirk and there are no PRAGMAs. Skip rather than
        # blow up, so swapping DATABASE_URL stays the config-only change §5
        # promises.
        return

    dbapi_connection.isolation_level = None

    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode = WAL")  # concurrent reads while writing
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.close()


@event.listens_for(engine, "begin")
def _emit_sqlite_begin(connection) -> None:
    """Issue BEGIN explicitly, the other half of the isolation_level=None fix.

    With the driver's implicit transaction handling disabled, nothing else opens
    one -- every statement would otherwise autocommit, which is worse than the
    problem we started with.
    """
    if engine.dialect.name == "sqlite":
        connection.exec_driver_sql("BEGIN")


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request, always closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create the schema if absent, then sanity-check its version.

    Decision §6-4: no Alembic in M1, just CREATE TABLE IF NOT EXISTS at boot.
    """
    # Imported for the side effect of registering the tables on Base.metadata.
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _check_schema_version()


def _check_schema_version() -> None:
    """Guard against the known blind spot of decision §6-4.

    `CREATE TABLE IF NOT EXISTS` creates a table that does not exist; it does
    NOT alter one that does. So the day a column is added, an existing DB keeps
    the old shape and the app fails at query time rather than at boot -- far
    from the cause. Recording the version the code expects turns that into a
    warning on the very first startup after the change.

    Warn rather than refuse to start: this is a single-user practice project,
    and a hard failure at boot would be worse than a loud log line.
    """
    from app.models import Setting

    with SessionLocal() as db:
        stored = db.scalar(select(Setting).where(Setting.key == SCHEMA_VERSION_KEY))

        if stored is None:
            # Fresh DB (or one created before this guard existed). Stamp it.
            # Value is JSON-encoded to match the stringify-on-write convention
            # the settings table inherits from localStorage (CLAUDE.md).
            db.add(
                Setting(
                    key=SCHEMA_VERSION_KEY,
                    value=json.dumps(SCHEMA_VERSION),
                    updated_at=utc_now_iso(),
                )
            )
            db.commit()
            logger.info("schema initialised at version %s", SCHEMA_VERSION)
            return

        try:
            found = json.loads(stored.value)
        except json.JSONDecodeError:
            found = stored.value

        if found != SCHEMA_VERSION:
            logger.warning(
                "SCHEMA MISMATCH: database is at version %s, code expects %s. "
                "CREATE TABLE IF NOT EXISTS does not alter existing tables, so "
                "this DB may be missing columns the code will query. Migrate it "
                "(this is the point where Alembic earns its keep) and update the "
                "%s setting.",
                found,
                SCHEMA_VERSION,
                SCHEMA_VERSION_KEY,
            )
