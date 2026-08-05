"""POST /api/import (spec §4.2) -- the import path over HTTP.

Accepts either `application/json` (the export file body verbatim) or
`multipart/form-data` with a `file` field, so the existing 「從檔案匯入」 and
「從剪貼簿匯入」 buttons can both target this one endpoint in M2.
"""

from __future__ import annotations

import json
from typing import Any, Literal

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import InvalidDataFormatError
from app.schemas import ImportResultOut
from app.services.importer import import_export_file

router = APIRouter(tags=["import"])


async def _read_payload(request: Request, upload: UploadFile | None) -> Any:
    """Pull the export document out of whichever body shape arrived."""
    if upload is not None:
        raw = await upload.read()
    else:
        raw = await request.body()

    if not raw:
        raise InvalidDataFormatError("invalid data format: request body is empty")

    try:
        # utf-8-sig strips a BOM, which Windows text editors add and which makes
        # json.loads fail with a baffling "Expecting value: line 1 column 1".
        return json.loads(raw.decode("utf-8-sig"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise InvalidDataFormatError(f"invalid data format: not valid JSON ({exc})") from exc


@router.post("/import", response_model=ImportResultOut, response_model_by_alias=True)
async def import_records(
    request: Request,
    db: Session = Depends(get_db),
    strategy: Literal["skip", "overwrite"] = Query(default="skip"),
    dry_run: bool = Query(default=False),
    file: UploadFile | None = File(default=None),
) -> ImportResultOut:
    """Import an export file (§4.2).

    Note `overwrite` now genuinely overwrites (§6-3) -- today's importFromJSON
    counts duplicates as skipped under both strategies, so this flag changes
    data where it previously did nothing.
    """
    payload = await _read_payload(request, file)
    report = import_export_file(db, payload, strategy=strategy, dry_run=dry_run)

    # Response deliberately mirrors the ImportResult type the frontend already
    # renders; the dry-run split (same_row vs same_slot) stays internal to the
    # report and is surfaced only by the CLI (§4.1).
    return ImportResultOut(
        imported=report.imported,
        skipped=report.skipped,
        errors=report.errors,
        error_messages=report.error_messages,
    )
