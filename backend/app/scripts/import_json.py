"""CLI importer (spec §4.1) -- the recommended path for the one-off migration.

    docker compose run --rm api python -m app.scripts.import_json \
        /data/import/body-weight-data-2026-08-04.json

Preferred over the HTTP endpoint for the real migration: it runs inside the
container with the DB volume mounted, needs no HTTP layer, and --dry-run lets you
preview before committing.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from app.db import SessionLocal, init_db
from app.errors import ApiError
from app.services.importer import ImportReport, import_export_file


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m app.scripts.import_json",
        description="Import a body-weight export JSON file into the API's database.",
    )
    parser.add_argument("path", help="path to the export JSON file")
    parser.add_argument(
        "--strategy",
        choices=["skip", "overwrite"],
        default="skip",
        help="what to do with a row that already exists (default: skip)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="report what would happen, write nothing",
    )
    return parser


def _print_report(report: ImportReport) -> None:
    """The §4.1 report shape.

    The two kinds of duplicate are printed separately because they mean
    different things and only one of them is suspicious: a created_at match is
    just the same file imported twice, while a date collision is two different
    rows claiming the same minute -- which under UNIQUE(date) is now the thing
    that can lose you data.
    """
    print(f"{report.rows_read} rows read")
    print(f"   {report.inserted} new")
    print(f"    {report.same_row} same row already present   (created_at matched)")
    suffix = "  <-- look at these" if report.same_slot else ""
    print(f"    {report.same_slot} same timestamp, different row  (date collided){suffix}")

    if report.settings_imported:
        print(f"    {report.settings_imported} settings imported")

    if report.errors:
        print(f"    {report.errors} errors")
        # Cap the listing: a badly-formed file could otherwise print thousands of
        # lines and bury the counts above.
        for message in report.error_messages[:20]:
            print(f"      - {message}")
        if len(report.error_messages) > 20:
            print(f"      ... and {len(report.error_messages) - 20} more")

    print()
    if report.dry_run:
        print("DRY RUN -- nothing was written. Re-run without --dry-run to apply.")
    else:
        print(f"applied with strategy={report.strategy}: "
              f"{report.imported} imported, {report.skipped} skipped")


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)

    path = Path(args.path)
    if not path.is_file():
        print(f"error: no such file: {path}", file=sys.stderr)
        return 2

    try:
        # utf-8-sig strips a BOM if a Windows editor added one.
        payload = json.loads(path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as exc:
        print(f"error: {path} is not valid JSON: {exc}", file=sys.stderr)
        return 2

    # Same startup path the API uses, so running the CLI against a fresh volume
    # creates the schema rather than failing on a missing table.
    init_db()

    with SessionLocal() as db:
        try:
            report = import_export_file(
                db, payload, strategy=args.strategy, dry_run=args.dry_run
            )
        except ApiError as exc:
            print(f"error: {exc.message}", file=sys.stderr)
            return 2

    _print_report(report)

    # Non-zero on row errors so a scripted migration notices. A dry run that
    # found date collisions still exits 0 -- collisions are information, not
    # failure, and the report already flags them.
    return 1 if report.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
