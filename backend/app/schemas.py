"""Pydantic request/response models (spec §3).

Field names match `BodyRecord` in src/types/index.ts exactly (snake_case) so M2
needs no mapping layer. Validation mirrors `validateRecordForm` in
src/utils/validators.ts -- Pydantic is the first line of defence, the CHECK
constraints in models.py are the last.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator, model_validator

from app.utils import is_valid_date

# Strict minute precision. The UNIQUE(date) index means "one measurement per
# minute", which only holds if every stored value has exactly this precision.
# (The importer is more forgiving -- see utils.normalize_date.)
DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$"


class RecordCreate(BaseModel):
    """POST /api/records body (§3.2). `date` and `weight` required."""

    # extra="ignore" so posting a whole export row (which carries `id` and
    # `created_at`) doesn't 422. Those fields are server-owned: the DB assigns
    # ids (§2) and the API stamps the timestamps.
    model_config = ConfigDict(extra="ignore")

    date: str = Field(pattern=DATE_PATTERN)
    # Declared before muscle_mass on purpose -- see _muscle_mass_within_weight.
    weight: float = Field(gt=0, lt=500)
    body_fat_percentage: float | None = Field(default=None, ge=0, le=100)
    water_percentage: float | None = Field(default=None, ge=0, le=100)
    # Upper bound is checked against `weight` below, not here.
    muscle_mass: float | None = Field(default=None, gt=0)
    notes: str | None = None

    @field_validator("date")
    @classmethod
    def _reject_future_dates(cls, value: str) -> str:
        """Mirrors isValidDate: must parse, and must not be in the future."""
        if not is_valid_date(value):
            raise ValueError("must be a valid date and not in the future")
        return value

    @field_validator("muscle_mass")
    @classmethod
    def _muscle_mass_within_weight(cls, value: float | None, info: ValidationInfo) -> float | None:
        """Mirrors isValidMuscleMass: muscle_mass must not exceed weight.

        A field_validator rather than a model_validator, even though the rule is
        cross-field. A model_validator's error carries no field location, so it
        surfaces in the §3.6 envelope as `field: "request"` -- useless to the
        frontend, which renders errors against the input they belong to. Reading
        `weight` out of info.data gets the same rule with `field:
        "muscle_mass"`, and works only because weight is declared first:
        info.data holds fields validated *before* this one.
        """
        weight = info.data.get("weight")
        # weight absent means it failed its own validation; that error is already
        # being reported, so don't pile a confusing second one on top.
        if value is not None and weight is not None and value > weight:
            raise ValueError("cannot exceed weight")
        return value


class RecordUpdate(BaseModel):
    """PATCH /api/records/{id} body (§3.3) -- partial update.

    Omitted keys are left untouched; an explicit `null` clears an optional
    field. The service layer tells the two apart with
    `model_dump(exclude_unset=True)`, which is why every field defaults to None
    rather than to a sentinel.

    Note `muscle_mass <= weight` is NOT validated here: it has to be checked
    against the post-merge row (patching only `weight` can invalidate a
    `muscle_mass` already in the DB), so services/records.py owns that rule.
    """

    model_config = ConfigDict(extra="ignore")

    date: str | None = Field(default=None, pattern=DATE_PATTERN)
    weight: float | None = Field(default=None, gt=0, lt=500)
    body_fat_percentage: float | None = Field(default=None, ge=0, le=100)
    water_percentage: float | None = Field(default=None, ge=0, le=100)
    muscle_mass: float | None = Field(default=None, gt=0)
    notes: str | None = None

    @field_validator("date")
    @classmethod
    def _reject_future_dates(cls, value: str | None) -> str | None:
        if value is not None and not is_valid_date(value):
            raise ValueError("must be a valid date and not in the future")
        return value

    @model_validator(mode="after")
    def _reject_nulling_required_columns(self) -> RecordUpdate:
        """`date` and `weight` are NOT NULL, so `{"weight": null}` is a 422, not
        a clear. Distinguishing that from an omitted key needs model_fields_set,
        because both look like None on the attribute."""
        for name in ("date", "weight"):
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self

    @model_validator(mode="after")
    def _require_at_least_one_field(self) -> RecordUpdate:
        if not self.model_fields_set:
            raise ValueError("at least one field must be provided")
        return self


class RecordOut(BaseModel):
    """Response shape for a single record (§3.1 example).

    Absent optional values serialize as `null`. The frontend's
    `record.x ? ... : '-'` checks treat null and undefined identically, so this
    is safe despite src/types/index.ts declaring them as `?: number` (§1).
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    date: str
    weight: float
    body_fat_percentage: float | None = None
    water_percentage: float | None = None
    muscle_mass: float | None = None
    notes: str | None = None
    created_at: str
    updated_at: str


class RecordListResponse(BaseModel):
    """Envelope, not a bare array (§3.1), so `total` is available for the
    「總共 N 筆紀錄」 counter without a second request."""

    items: list[RecordOut]
    total: int
    limit: int
    offset: int


class SettingUpdate(BaseModel):
    """PUT /api/settings/{key} body (§3.5): {"value": 178}.

    `Any` because settings hold whatever the frontend's UserSettings declares --
    numbers (height), strings (theme), enums (default_chart_range). The value is
    JSON-encoded on write.
    """

    value: Any


class ImportQuery(BaseModel):
    """Query params for POST /api/import (§4.2)."""

    strategy: Literal["skip", "overwrite"] = "skip"
    dry_run: bool = False


class ImportResultOut(BaseModel):
    """Response for POST /api/import (§4.2).

    Deliberately the same shape as the `ImportResult` type the frontend already
    renders -- note `errorMessages` is camelCase there while everything else in
    the API is snake_case, so it gets a serialization alias rather than being
    silently "corrected".
    """

    model_config = ConfigDict(populate_by_name=True)

    imported: int
    skipped: int
    errors: int
    error_messages: list[str] = Field(default_factory=list, serialization_alias="errorMessages")


class HealthResponse(BaseModel):
    """GET /api/health (§3.5) -- what the compose healthcheck polls."""

    status: str = "ok"
