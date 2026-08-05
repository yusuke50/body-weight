"""Record endpoints (spec §3.1-§3.5)."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import RecordCreate, RecordListResponse, RecordOut, RecordUpdate
from app.services import records as records_service

router = APIRouter(prefix="/records", tags=["records"])


@router.get("", response_model=RecordListResponse)
def list_records(
    db: Session = Depends(get_db),
    start: str | None = Query(default=None, description="inclusive lower bound on `date`"),
    end: str | None = Query(default=None, description="inclusive upper bound on `date`"),
    order: Literal["asc", "desc"] = Query(default="desc", description="by `date`"),
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> RecordListResponse:
    """List records (§3.1).

    Pagination exists so the chart views can stop over-fetching later; M2's
    useRecords maps to `?order=asc` with a high limit, matching what
    getAllRecords('date','ASC') does today.
    """
    items, total = records_service.list_records(
        db, start=start, end=end, order=order, limit=limit, offset=offset
    )
    return RecordListResponse(
        items=[RecordOut.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{record_id}", response_model=RecordOut)
def get_record(record_id: int, db: Session = Depends(get_db)) -> RecordOut:
    """Single record (§3.5). Cheap, and useful for debugging."""
    return RecordOut.model_validate(records_service.get_record(db, record_id))


@router.post("", response_model=RecordOut, status_code=status.HTTP_201_CREATED)
def create_record(
    payload: RecordCreate,
    response: Response,
    db: Session = Depends(get_db),
) -> RecordOut:
    """Create (§3.2). 409 if `date` is taken; 422 on validation failure."""
    record = records_service.create_record(db, payload)
    # §3.2 specifies a Location header alongside the 201.
    response.headers["Location"] = f"/api/records/{record.id}"
    return RecordOut.model_validate(record)


@router.patch("/{record_id}", response_model=RecordOut)
def update_record(
    record_id: int,
    payload: RecordUpdate,
    db: Session = Depends(get_db),
) -> RecordOut:
    """Partial update (§3.3), matching the data-table inline edit in App.tsx,
    which sends only the four numeric fields."""
    return RecordOut.model_validate(records_service.update_record(db, record_id, payload))


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(record_id: int, db: Session = Depends(get_db)) -> Response:
    """Delete (§3.4). 204 with an empty body, 404 if no such id."""
    records_service.delete_record(db, record_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
