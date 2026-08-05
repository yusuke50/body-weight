"""GET /api/health (spec §3.5) -- what the compose healthcheck polls."""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Deliberately does not touch the DB: the healthcheck should report that the
    HTTP process is up, not turn a slow query into a container restart."""
    return HealthResponse(status="ok")
