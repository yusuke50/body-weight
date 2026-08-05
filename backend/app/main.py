"""FastAPI application (spec §3, §5)."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_db
from app.errors import register_error_handlers
from app.routers import health, imports, records, settings as settings_router

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Create the schema on boot (§6-4: no Alembic in M1) and log where the DB is.

    Logging the resolved DATABASE_URL costs nothing and answers the first
    question you ask when data seems to have vanished -- usually "which file did
    it actually open?", since the compose default and the bare-uvicorn default
    are different paths.
    """
    logger.info("using database: %s", settings.database_url)
    init_db()
    yield


app = FastAPI(
    title="Body Weight API",
    version="0.1.0",
    description="M1 backend for the body-weight tracker. See docs/backend-spec.md.",
    lifespan=lifespan,
)

# Without the Vite dev origin here, M2 wiring dies at the first fetch with an
# opaque CORS error. allow_credentials stays off: single-user localhost, no
# cookies or auth (§7).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Must run before the routers see traffic so every failure comes back in the one
# §3.6 envelope.
register_error_handlers(app)

# Base path /api for everything (§3).
app.include_router(health.router, prefix="/api")
app.include_router(records.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")
app.include_router(imports.router, prefix="/api")
