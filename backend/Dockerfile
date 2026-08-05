# Backend image for the M1 API (docs/backend-spec.md §5).
FROM python:3.13-slim

# PYTHONDONTWRITEBYTECODE: no .pyc litter in the bind-mounted app/ dir.
# PYTHONUNBUFFERED: uvicorn logs reach `docker compose logs` immediately.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Copy the manifest before the source so the dependency install layer stays
# cached across ordinary app-code edits.
COPY pyproject.toml ./
COPY app ./app
RUN pip install --no-cache-dir .

# /data is where the named volume gets mounted (compose.yaml) and where the
# SQLite file is created. It has to exist and be owned by the runtime user at
# image build time: Docker seeds a fresh named volume from the image path,
# ownership included, so chown-ing here is what lets the non-root user write
# bodyweight.db (and the -wal/-shm sidecars WAL mode creates).
RUN mkdir -p /data \
    && useradd --system --uid 1000 api \
    && chown -R api:api /data /app
USER api

EXPOSE 8000

# compose.yaml overrides this with a --reload variant for dev.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
