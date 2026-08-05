"""One error shape everywhere (spec §3.6), so M2 has a single error path.

    {
      "error": "validation_error",
      "message": "weight must be between 0 and 500",
      "details": [{ "field": "weight", "message": "must be between 0 and 500" }]
    }

`details` matches the `{ field, message }[]` shape `ValidationResult` already
uses in src/types/index.ts, so the frontend's existing form-error rendering can
be reused as-is.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class ApiError(Exception):
    """Base for every error this app raises deliberately.

    `extra` exists for the 409 body in §3.2, which carries an `existing` key
    instead of `details` -- one envelope, but not a rigid one.
    """

    status_code = 500
    error = "internal_error"

    def __init__(
        self,
        message: str,
        *,
        details: list[dict[str, str]] | None = None,
        extra: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.details = details
        self.extra = extra or {}

    def body(self) -> dict[str, Any]:
        payload: dict[str, Any] = {"error": self.error, "message": self.message}
        if self.details is not None:
            payload["details"] = self.details
        payload.update(self.extra)
        return payload


class NotFoundError(ApiError):
    status_code = 404
    error = "not_found"


class ValidationError(ApiError):
    status_code = 422
    error = "validation_error"


class InvalidDataFormatError(ApiError):
    """Import envelope missing `version` or `records` (§4 rule 1)."""

    status_code = 422
    error = "invalid_data_format"


class DuplicateRecordError(ApiError):
    """UNIQUE(date) violation -- §3.2 / §3.3.

    Carries the colliding record so the caller can show it without a second
    request. Only the three identifying fields, matching the §3.2 example.
    """

    status_code = 409
    error = "duplicate_record"

    def __init__(self, existing: dict[str, Any]) -> None:
        super().__init__(
            "A record already exists at this time.",
            extra={"existing": existing},
        )


def _field_from_loc(loc: tuple[Any, ...]) -> str:
    """Turn a Pydantic error location into a bare field name.

    Pydantic reports ('body', 'weight'); the frontend wants 'weight'. Drop the
    request-part prefix and keep the last string segment, so nested/list
    locations still yield something meaningful.
    """
    parts = [str(part) for part in loc if part not in ("body", "query", "path")]
    return parts[-1] if parts else "request"


def register_error_handlers(app: FastAPI) -> None:
    """Wire every failure mode onto the §3.6 envelope.

    Codes (§3.6): 400 malformed JSON · 404 not found · 409 duplicate ·
    422 validation · 500 unexpected.
    """

    @app.exception_handler(ApiError)
    async def _handle_api_error(_: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=exc.body())

    @app.exception_handler(RequestValidationError)
    async def _handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        raw = exc.errors()

        # A body that isn't valid JSON at all arrives here too, but it is a 400
        # (malformed request) rather than a 422 (well-formed but invalid).
        if any(err.get("type") == "json_invalid" for err in raw):
            return JSONResponse(
                status_code=400,
                content={
                    "error": "invalid_json",
                    "message": "Request body is not valid JSON.",
                },
            )

        details = [
            {"field": _field_from_loc(err.get("loc", ())), "message": err.get("msg", "is invalid")}
            for err in raw
        ]
        # Promote the first detail into `message` so a caller that only reads
        # `message` still gets something specific.
        message = (
            f"{details[0]['field']} {details[0]['message']}"
            if details
            else "Request validation failed."
        )
        return JSONResponse(
            status_code=422,
            content={"error": "validation_error", "message": message, "details": details},
        )

    @app.exception_handler(StarletteHTTPException)
    async def _handle_http_exception(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        # Covers framework-generated responses (404 on an unknown path, 405 on a
        # wrong method) so even those come back in the one envelope.
        codes = {400: "bad_request", 404: "not_found", 405: "method_not_allowed", 409: "conflict"}
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": codes.get(exc.status_code, "error"),
                "message": str(exc.detail),
            },
        )

    @app.exception_handler(Exception)
    async def _handle_unexpected(_: Request, exc: Exception) -> JSONResponse:
        # Log the traceback but never leak it to the client.
        logger.exception("unhandled error: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"error": "internal_error", "message": "An unexpected error occurred."},
        )
