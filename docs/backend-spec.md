# Backend Spec — FastAPI + SQLite

**Status: M1 skeleton built and verified against this spec (2026-08-05).** The four decisions in §6 were answered on 2026-08-04, §2–§5 were rewritten against them, and the `backend/` service now implements all of it — schema, CRUD, settings, and both import entry points. Verified end-to-end in the container on 2026-08-05: the image builds, `docker compose up --wait` reports healthy, `GET /api/health` returns 200, the §3.6 envelope was checked against the 404 / 400 / 422 paths, and the CLI importer's `--dry-run` ran inside the container against a real export file (including a deliberately planted same-minute collision, which it caught). Both databases are still empty apart from `schema_version` — no data has been migrated yet. That pass also turned up one blocking defect: see "Known defect: the container clock is UTC" in §3.2. This is the M1 target (see [CLAUDE.md](../CLAUDE.md) working rules). M2 is wiring the existing React frontend to it; nothing here changes any file under `src/`.

Goal: replace the browser-localStorage data layer with a real Python API + relational DB, without changing the domain model the frontend already speaks.

---

## 1. Data shape we're migrating from

The current export file (`exportService.ts` → `exportToJSON`) looks like this:

```json
{
  "version": "1.0",
  "exportDate": "2026-08-04T06:36:12.345Z",
  "records": [
    {
      "id": 1,
      "date": "2026-07-30T08:15",
      "weight": 57.5,
      "body_fat_percentage": 32.5,
      "water_percentage": 50.5,
      "muscle_mass": 37.5,
      "notes": "after breakfast",
      "created_at": "2026-07-30T00:15:03.221Z"
    }
  ],
  "settings": { "height": 180 }
}
```

Three quirks worth carrying forward deliberately:

| Quirk | Why it exists | Decision for the backend |
| --- | --- | --- |
| `date` is **local naive** (`YYYY-MM-DDTHH:mm`, from a `datetime-local` input) while `created_at` is **UTC with `Z`** | `toLocalDateTimeString` keeps the input in the user's timezone | Keep both as-is. `date` stays a naive local string; `created_at`/`updated_at` are UTC. Do **not** "fix" `date` into UTC — it would shift every existing record. |
| Optional fields are **absent or `undefined`**, never `null` | `safeParseFloat` returns `undefined` | Accept missing/`null`/absent all as SQL `NULL`; serialize back as `null`. The frontend's `record.x ? ... : '-'` checks treat `null` and `undefined` the same, so this is safe. |
| `id` is `max(existing)+1`, assigned client-side | no DB sequence in localStorage | The DB owns IDs now (`AUTOINCREMENT`). On import, incoming `id` values are **ignored**, not preserved — see §4. Note this scheme *reuses* an id after the highest record is deleted, so it is not usable as identity either — see §2. |
| `created_at` is **overwritten on import** — `importFromJSON` drops it and `addRecord` stamps a fresh one | a bug, not a design choice (`exportService.ts:90-99`) | The backend **preserves** incoming `created_at` (§4 rule 3). This is what makes it usable as the importer's row-identity key (§2); without the fix it stays worthless. |

Derived metrics (net/lean weight, body-fat weight, FFMI) are **not** stored and must not be added to the schema — they stay computed, as they are today in `utils/calculations.ts`.

---

## 2. DB schema

SQLite. Two tables, mirroring the two localStorage keys (`bodyweight_db_v2` → `records`, `bodyweight_settings` → `settings`).

```sql
PRAGMA journal_mode = WAL;      -- concurrent reads while writing
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS records (
    -- AUTOINCREMENT is load-bearing, not decoration. A bare
    -- `INTEGER PRIMARY KEY` is a rowid alias and picks max(rowid)+1, so
    -- deleting the highest row lets the next insert REUSE that id -- the exact
    -- bug `addRecord` has today. AUTOINCREMENT keeps a high-water mark in
    -- sqlite_sequence and never reuses. Costs one extra table write per insert;
    -- irrelevant at this scale, and non-reuse is the whole point.
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Local naive measurement time, 'YYYY-MM-DDTHH:mm'. Lexicographic order
    -- == chronological order for this format, so plain string comparison
    -- works for range filters (same trick getRecordsByDateRange uses today).
    date                TEXT    NOT NULL,

    weight              REAL    NOT NULL CHECK (weight > 0 AND weight < 500),
    body_fat_percentage REAL             CHECK (body_fat_percentage IS NULL OR (body_fat_percentage >= 0 AND body_fat_percentage <= 100)),
    water_percentage    REAL             CHECK (water_percentage    IS NULL OR (water_percentage    >= 0 AND water_percentage    <= 100)),
    muscle_mass         REAL             CHECK (muscle_mass         IS NULL OR (muscle_mass > 0 AND muscle_mass <= weight)),
    notes               TEXT,

    created_at          TEXT    NOT NULL,   -- UTC ISO-8601, e.g. '2026-08-04T06:36:12.345Z'
    updated_at          TEXT    NOT NULL
);

-- Domain key (§6-1): one measurement per minute. UNIQUE also serves the
-- "by measurement time" read paths (newest-first list, range filter), so no
-- separate non-unique index on `date` is needed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_records_date ON records (date);

-- Row-identity lookup for the importer (§4). Deliberately NOT unique --
-- see "Why created_at is an index, not a constraint" below.
CREATE INDEX IF NOT EXISTS idx_records_created_at ON records (created_at);

CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    -- JSON-encoded value, matching the existing stringify-on-write /
    -- parse-on-read convention (see CLAUDE.md "Settings quirk").
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

The `CHECK` constraints intentionally mirror `utils/validators.ts` (weight 0–500, percentages 0–100, muscle mass ≤ weight) so the DB is the last line of defence and Pydantic is the first.

### Two implementation notes that bit during M1

Both are recorded here because neither is visible in the DDL above, and both fail *silently* — the code looks correct and does the wrong thing.

1. **`AUTOINCREMENT` needs the `sqlite_autoincrement` dialect option**, not just SQLAlchemy's `autoincrement=True`. That flag only marks which column the ORM treats as generated; the keyword comes from `__table_args__ = (..., {"sqlite_autoincrement": True})`. Without it you get a bare `INTEGER PRIMARY KEY` — a rowid alias that reuses ids exactly like `addRecord` does today, which is the whole bug this column exists to fix. Verify it in the emitted DDL and check that `sqlite_sequence` has a `records` row; don't trust it.

2. **The PRAGMAs must go in a connection-level event hook**, not a one-off call at startup — `foreign_keys` is per-connection and SQLAlchemy's pool opens connections lazily, so a single call at boot misses most of them. And on top of that, **`pysqlite` manages transactions itself by default, which breaks `SAVEPOINT`**: the importer's per-row savepoints (§4 rules 4 + 7) end up committing, so `--dry-run` writes to the database. The fix is SQLAlchemy's documented pysqlite workaround — set `isolation_level = None` on connect and emit `BEGIN` from a `begin` event handler. This one is worth a deliberate test: a dry run that quietly writes looks like a successful dry run.

### Decided: two keys, doing two different jobs (§6-1)

Today there is **no primary key** — duplicates are caught by the heuristic `checkRecordExists(date, weight, tolerance=0.1)`: same `date` string *and* weight within 0.1 kg. That single heuristic was being asked to answer two questions that are not the same question:

| Question | Answered by | Enforced how |
| --- | --- | --- |
| "Is this the same **row** I already have?" (the same export file imported twice) | `created_at` | application-level match in the importer (§4) |
| "Can two measurements exist at the same **instant**?" (the same measurement typed on two devices) | `date` | `UNIQUE` index, DB-enforced |

Neither one covers the other. `created_at` cannot catch the cross-device case — the same measurement entered separately on a phone and a laptop is two rows with two different creation instants, and cross-device manual JSON sync is exactly the situation this migration exists to fix. `date` cannot tell you a row is *literally the same row*; it only tells you the slot is taken.

#### Why not `id`

The export carries an `id`, but it is unusable as identity — twice over:

- `addRecord` (`src/services/dataService.ts:17`) computes `Math.max(...ids) + 1`. Delete the highest-id record and the **next insert reuses that id**. It is not stable even within one browser.
- It is per-device. Two devices both start at 1. And after migration the DB assigns its own ids, so an incoming `id` refers to nothing.

Incoming `id` values are therefore ignored on import — see §4 rule 2.

#### Ids are assigned once and never renumbered

The DB owns ids (`AUTOINCREMENT`, above) and assigns them at insert. It does **not** renumber them afterwards — not on import, not on merge, not to close gaps. A key that can change is not a key:

- The frontend holds ids in memory. `DELETE /api/records/5` after a renumber deletes whatever now happens to be 5, not what the user clicked.
- Renumbering under `UNIQUE`/PK means every shift can collide with a row that already holds the target id, so it needs a two-pass or temp-offset dance — real complexity for no gain.
- The moment a second table references `records.id` (photos, tags — likely in later projects), renumbering silently breaks the references.

The chronological-ids outcome people usually want from renumbering comes free at migration time instead: the importer inserts rows **sorted by `created_at`** (§4 rule 2), so a one-time merge of two devices' exports produces ids 1, 2, 3… in creation order. Rows imported *later* just append (4, 5, 6…) rather than interleaving by time — which is fine, because list order comes from `ORDER BY date`, not from the id.

Worth noting that this problem is mostly dissolved by M1 rather than solved by it: two devices only had colliding ids because each browser ran its own `max+1` counter over its own localStorage. Once both point at one API there is a single id space with a single owner. The merge is a one-time migration concern, not an ongoing one.

#### Why `created_at` is an index, not a constraint

`created_at` is millisecond-precision and would look like a natural `UNIQUE` candidate. It is not, because the current import path already corrupts it:

`importFromJSON` (`src/services/exportService.ts:90-99`) builds `recordToAdd` **without** `created_at`, and `addRecord` then stamps its own `new Date().toISOString()`. Two consequences:

1. Any record that has ever been imported has a `created_at` of *import time*, not entry time. The same measurement on two devices carries two different values — which is the other half of why `date` is still needed.
2. Rows imported inside the same millisecond get **identical** `created_at`. A `UNIQUE` constraint could therefore reject data you already have.

So: plain index, matched by the importer, no constraint. The new backend must **preserve incoming `created_at`** (§4 rule 3) — otherwise it repeats the same bug and the row-identity key stays worthless.

#### Accepted cost of `UNIQUE (date)`

This is a deliberate behaviour change. Under localStorage two records at the same minute with different weights were both legal; they no longer are, and the 0.1 kg tolerance disappears entirely. `date` is minute-precision, so two genuinely distinct measurements inside one minute are implausible — the tolerance rule was a workaround for having no key, not a feature.

Practical consequence: **the existing export may not import cleanly.** If it contains two rows sharing a `date`, the second collides. Run `--dry-run` *before* the real migration (§4.1). If there turn out to be same-minute pairs worth keeping, nudge one by a minute rather than dropping the constraint.

---

## 3. CRUD endpoints

Base path `/api`. JSON in, JSON out, UTF-8. Field names match `BodyRecord` in `src/types/index.ts` exactly (`snake_case`) so no mapping layer is needed in M2.

### 3.1 `GET /api/records` — list

Query params, all optional:

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `start` | `YYYY-MM-DDTHH:mm` | — | inclusive lower bound on `date` |
| `end` | `YYYY-MM-DDTHH:mm` | — | inclusive upper bound |
| `order` | `asc` \| `desc` | `desc` | by `date` |
| `limit` | int 1–1000 | `200` | |
| `offset` | int ≥ 0 | `0` | |

The frontend's `useRecords` currently loads **everything** (`getAllRecords('date','ASC')`) and derives `latestRecord`/`previousRecord` from the array ends. In M2 that maps to `?order=asc` with a high `limit`; pagination exists so the chart views can stop over-fetching later.

```http
GET /api/records?order=desc&limit=2
```

```json
{
  "items": [
    {
      "id": 42,
      "date": "2026-08-03T07:40",
      "weight": 56.8,
      "body_fat_percentage": 31.9,
      "water_percentage": 51.2,
      "muscle_mass": 36.9,
      "notes": null,
      "created_at": "2026-08-02T23:41:07.882Z",
      "updated_at": "2026-08-02T23:41:07.882Z"
    },
    {
      "id": 41,
      "date": "2026-08-02T07:35",
      "weight": 57.1,
      "body_fat_percentage": 32.1,
      "water_percentage": 50.9,
      "muscle_mass": 37.0,
      "notes": "slept badly",
      "created_at": "2026-08-01T23:36:44.010Z",
      "updated_at": "2026-08-01T23:36:44.010Z"
    }
  ],
  "total": 42,
  "limit": 2,
  "offset": 0
}
```

`200 OK`. Envelope (not a bare array) so `total` is available for the 「總共 N 筆紀錄」 counter without a second request.

### 3.2 `POST /api/records` — create

Request — `date` and `weight` required, everything else optional:

```json
{
  "date": "2026-08-04T07:30",
  "weight": 56.6,
  "body_fat_percentage": 31.7,
  "water_percentage": 51.4,
  "muscle_mass": 36.8,
  "notes": "fasted"
}
```

`201 Created`, `Location: /api/records/43`, body is the full created record (with server-assigned `id`, `created_at`, `updated_at`).

Validation mirrors `validateRecordForm`: `weight` in (0, 500); percentages in [0, 100]; `muscle_mass` in (0, weight]; `date` must parse and **must not be in the future**. Failures return `422` (§3.6).

#### Known defect: the container clock is UTC, so the future check rejects valid records

Found 2026-08-05, **not yet fixed** — it blocks M2 and nothing else.

`date` is local-naive: it is whatever wall clock the *browser* is on (UTC+8 here). The future check in `utils.local_now_date()` compares it against `datetime.now()`, which is whatever wall clock the *server* is on. Those are the same thing when uvicorn runs on the host — which is why this passed local testing — and eight hours apart inside the container, where `TZ` is unset and Debian defaults to UTC.

Measured: container `datetime.now()` = `2026-08-05T06:14` while the host was at `14:14`. A record dated `2026-08-05T14:09` — five minutes old — came back `422 must be a valid date and not in the future`. Net effect: **the API rejects every record from the past 8 hours**, i.e. exactly the ones a user enters right after weighing themselves.

The CLI importer is unaffected: it calls `normalize_date`, never `is_valid_date`, so the migration path (§4.1) is safe and the dry-run reports stayed green throughout.

Note the timezone comment in `utils.py:36` is what encoded the wrong assumption — it says reading the server's timezone is "correct for the localhost single-user setup M1 targets", which holds for bare uvicorn but not for the container that same spec section prescribes.

Duplicate handling: `date` is UNIQUE (§2), so a create at an existing `date` returns `409 Conflict` with the existing record — regardless of weight — rather than silently creating a near-twin. Catch the `IntegrityError` and translate it; don't pre-check with a `SELECT`, which would race.

```json
{
  "error": "duplicate_record",
  "message": "A record already exists at this time.",
  "existing": { "id": 42, "date": "2026-08-03T07:40", "weight": 56.8 }
}
```

### 3.3 `PATCH /api/records/{id}` — update

Partial update, matching how the data-table inline edit in `App.tsx` sends only the four numeric fields. Omitted keys are left untouched; an explicit `null` clears an optional field.

```json
{ "weight": 56.9, "body_fat_percentage": null }
```

`200 OK` with the full updated record; `updated_at` is refreshed. `404` if no such `id`. Same validation as create — note `muscle_mass <= weight` must be checked against the **post-merge** row, not just the payload. If a payload ever includes `date`, the UNIQUE constraint applies here too → `409`, same shape as §3.2.

### 3.4 `DELETE /api/records/{id}` — delete

`204 No Content`, empty body. `404` if no such `id`. Hard delete — no soft-delete column, matching current behaviour.

### 3.5 Also needed (small, not part of the four)

- `GET /api/records/{id}` → `200` single record / `404`. Cheap, and useful for debugging.
- `GET /api/settings` → `{ "height": 180 }` — values **already JSON-parsed**, matching `getAllSettings()`.
- `PUT /api/settings/{key}` → body `{ "value": 178 }`, stored JSON-encoded. This is what `useProfile` needs in M2.
- `GET /api/health` → `{ "status": "ok" }` for the compose healthcheck (§5).

### 3.6 Error format

One shape everywhere, so the frontend has a single error path:

```json
{
  "error": "validation_error",
  "message": "weight must be between 0 and 500",
  "details": [{ "field": "weight", "message": "must be between 0 and 500" }]
}
```

`details` mirrors the `{ field, message }[]` shape `ValidationResult` already uses, so existing form error rendering can be reused in M2 as-is.

Codes: `400` malformed JSON · `404` not found · `409` duplicate · `422` validation · `500` unexpected.

---

## 4. Importing the existing export file

Two entry points, one shared implementation. Both are ports of `importFromJSON`.

### 4.1 CLI script (recommended for the one-off migration)

```bash
docker compose run --rm api python -m app.scripts.import_json /data/import/body-weight-data-2026-08-04.json
```

Flags: `--strategy skip|overwrite` (default `skip`) · `--dry-run` (report only, no writes).

**Run this from PowerShell, not Git Bash.** Git Bash (MSYS2) rewrites any argument that looks like a Unix absolute path into a Windows one, so `/data/import/foo.json` reaches the container as `C:/Program Files/Git/data/import/foo.json` and the script exits 2 with `error: no such file`. The path never gets mangled on the way in — it is mangled before `docker` is even invoked, which is why the mount looks fine when you go and check it. Three workarounds if you are already in Git Bash: prefix `MSYS_NO_PATHCONV=1`, double the leading slash (`//data/import/...`), or pass it relative to the image's `WORKDIR=/app` (`../data/import/...`). All four routes were verified to produce identical reports.

`--dry-run` is not optional politeness here — run it first. With `date` now UNIQUE (§2) it is what tells you whether the export file contains same-minute collisions before you commit to the migration. Its report should separate the two kinds of duplicate, because they mean different things and only one of them is suspicious:

```
42 rows read
   35 new
    5 same row already present   (created_at matched)
    2 same timestamp, different row  (date collided)  <-- look at these
```

Preferred for the real migration: it runs inside the container with the DB volume mounted, needs no HTTP layer, and `--dry-run` lets you preview before committing.

### 4.2 `POST /api/import` — same thing over HTTP

Accepts either `application/json` (the export file body verbatim) or `multipart/form-data` with a `file` field, so the existing 「從檔案匯入」 / 「從剪貼簿匯入」 buttons can both target it in M2.

Query params: `strategy=skip|overwrite` (default `skip`), `dry_run=false`.

Response `200 OK` — deliberately the same shape as the `ImportResult` type the frontend already renders:

```json
{
  "imported": 38,
  "skipped": 4,
  "errors": 1,
  "errorMessages": ["record is missing required fields: {\"date\":\"2026-06-01T08:00\"}"]
}
```

### Import rules

1. **Validate the envelope.** Require `version` and an array `records`; otherwise `422 invalid data format`.
2. **Ignore incoming `id`, and insert sorted by `created_at` ascending.** The DB assigns its own ids. Preserving client-side `max+1` ids would collide the moment two devices' exports are merged — exactly the situation this migration exists to fix. Sorting first is what makes the migration's ids come out in creation order: merging device A's `id 1` (created 08-04) with device B's `id 1` (created 08-03) yields `id 1` = the 08-03 row, `id 2` = the 08-04 row. Rows with no `created_at` sort last. Nothing is ever renumbered after insert (§2).
3. **Preserve `created_at` when present**, else set it to now. `updated_at` = `created_at` on insert.
4. **Skip rows missing `date` or `weight`** → `errors++` with a message. (Current code checks `!record.weight`, which also rejects a weight of `0` — fine, since 0 is invalid anyway.)
5. **Dedup in two steps**, matching the two keys in §2. Step 1 asks "same row?", step 2 asks "same slot?".

   **Step 1 — row identity.** If the incoming row has a `created_at`, look for an existing row matching on `(created_at, date)` together. The pair rather than `created_at` alone, because §2 explains how the old importer could stamp identical `created_at` on rows written in the same millisecond; adding `date` disambiguates those at no cost. A hit means this is literally the same row: `skip` → `skipped++`; `overwrite` → update it, `imported++`.

   **Step 2 — the slot.** No `created_at`, or no match, means it may still be the same *measurement* arriving from another device. Insert and let the UNIQUE index decide:
   - `skip` → `INSERT … ON CONFLICT(date) DO NOTHING`, count no-ops as `skipped`.
   - `overwrite` → `INSERT … ON CONFLICT(date) DO UPDATE SET …`, refreshing the value columns and `updated_at`, keeping the existing `id` and `created_at`. Counted as `imported`.

   Track the two outcomes separately even though `ImportResult` only exposes `imported`/`skipped`/`errors` — §4.1's dry-run report needs the split, and a step-2 hit is the one worth eyeballing.

   Two consequences of decision §6-3 worth being explicit about: today's `importFromJSON` counts a duplicate as `skipped` under **both** strategies — `overwrite` is declared but never implemented — so `overwrite` now genuinely changes data where it previously did nothing. And `DO UPDATE` must not blank out fields the incoming row omits: build the `SET` clause from the keys actually present, or an export missing `notes` will erase the notes you have.
6. **Import `settings` too**, JSON-encoding each value on write. The current import path ignores `settings` entirely, so your height would be lost — worth fixing here.
7. **One transaction for the whole file.** All-or-nothing, so a failure halfway through can't leave a half-migrated DB. (Today's version writes row by row.)

---

## 5. Docker Compose

### The SQLite caveat, up front

You asked for API + DB as two services. With SQLite there is **no DB server** — it's a file linked into the API process, so a second container would have nothing to run. Modelling it as its own service isn't possible without changing the DB.

So the plan below is **one `api` service plus a named volume** holding `bodyweight.db`. The volume is what gives you the thing a separate DB service would have given you: data that survives rebuilds.

**Decided (§6-2): SQLite + named volume.** The Postgres variant below is kept as a sketch, not as the M1 target — but see the note at the end of that section: building on SQLAlchemy from day one keeps the switch a config change rather than a rewrite, so "two real services" stays available as a later exercise.

### Layout

```
compose.yaml              # repo ROOT, so `docker compose build` works from D:\code\body-weight
backend/
├── app/
│   ├── main.py           # FastAPI app, CORS, router registration
│   ├── config.py         # env-backed settings (DATABASE_URL, CORS_ORIGINS)
│   ├── db.py             # engine/session, PRAGMA setup, init_db
│   ├── models.py         # SQLAlchemy tables (§2)
│   ├── schemas.py        # Pydantic request/response models (§3)
│   ├── errors.py         # the one error envelope (§3.6)
│   ├── utils.py          # the two timestamp formats (§1)
│   ├── routers/
│   │   ├── health.py
│   │   ├── records.py
│   │   ├── settings.py
│   │   └── imports.py
│   ├── services/
│   │   ├── records.py    # CRUD + checkRecordExists port
│   │   ├── settings.py   # JSON-encode on write, parse on read
│   │   └── importer.py   # shared by CLI + endpoint (§4)
│   └── scripts/
│       └── import_json.py
├── data/                 # bind-mounted; drop export files here to import
├── Dockerfile
├── .dockerignore
└── pyproject.toml
```

`compose.yaml` sits at the repo root rather than inside `backend/` so `docker compose build` works from the project directory you are already in. Its paths (`build: ./backend`, `./backend/data:/data/import:ro`) are therefore relative to the root — the two have to agree, and putting the file in `backend/` while keeping `./backend/...` paths would resolve to `backend/backend/`.

Everything else is deliberately **outside** `src/` — see the "What backend means here" note in CLAUDE.md.

### `compose.yaml` (SQLite)

```yaml
services:
  api:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: sqlite:////data/bodyweight.db   # 4 slashes = absolute path
      CORS_ORIGINS: http://localhost:5173           # the Vite dev server
    volumes:
      - db-data:/data                    # the DB file lives here, survives rebuilds
      - ./backend/data:/data/import:ro   # export files to import, read-only
      - ./backend/app:/app/app           # live reload in dev; drop for prod
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    healthcheck:
      test: ["CMD", "python", "-c",
             "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"]
      interval: 30s
      timeout: 3s
      retries: 3

volumes:
  db-data:
```

Notes:
- `CORS_ORIGINS` must include `http://localhost:5173` or M2 wiring fails at the first fetch with an opaque CORS error.
- The DB file goes in the **named volume**, not a bind mount — bind-mounted SQLite on Windows/WSL hits file-locking problems that produce confusing `database is locked` errors.
- `--reload` and the `./backend/app` mount are dev conveniences; a prod compose file would drop both.

### Postgres variant — *not chosen for M1, kept for reference*

```yaml
services:
  api:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql+psycopg://bw:bw@db:5432/bodyweight
      CORS_ORIGINS: http://localhost:5173
    depends_on:
      db:
        condition: service_healthy      # don't start until Postgres accepts connections

  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: bw
      POSTGRES_PASSWORD: bw
      POSTGRES_DB: bodyweight
    volumes:
      - pg-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bw"]
      interval: 5s
      retries: 5

volumes:
  pg-data:
```

The §2 schema ports over with `INTEGER PRIMARY KEY AUTOINCREMENT` → `BIGSERIAL`/`GENERATED AS IDENTITY` and `REAL` → `DOUBLE PRECISION`; everything else is unchanged. Using SQLAlchemy from the start (as in the layout above) keeps this a config swap rather than a rewrite.

---

## 6. Decisions — all four settled (2026-08-04)

These were the four blockers. They are now answered, and §2–§5 above have been rewritten to match; this section is the record of what was chosen and why, not an open question list.

1. **Two keys: `UNIQUE (date)` + `created_at` as the importer's row-identity match.** `date` is the domain key (one measurement per instant, DB-enforced); `created_at` answers the different question of "same row re-imported". `id` is DB-owned (`AUTOINCREMENT`, never reused, never renumbered) and is not a merge key — the client's `max+1` scheme reuses ids after a delete and is per-device. `created_at` gets an index but no constraint, because the current import path can stamp duplicate values. Accepted cost: same-minute records with different weights become illegal, and the existing export must be `--dry-run` checked first. Full reasoning in §2.
2. **SQLite + named volume** (not Postgres). Fastest path to a running M1; the compose file is one service plus a volume. Written on SQLAlchemy so the Postgres variant in §5 stays a config swap if you later want the two-service exercise.
3. **`overwrite` genuinely overwrites** (§4 rule 5) via `ON CONFLICT DO UPDATE`, replacing today's declared-but-unimplemented no-op. The `SET` clause must be built from keys actually present so omitted fields aren't blanked.
4. **No Alembic in M1.** `CREATE TABLE IF NOT EXISTS` at startup (already reflected in the §2 DDL), run once from `db.py` on app boot. Defensible for a single-user practice project where the DB starts empty; introduce Alembic at the first real schema change, when there is finally something to migrate *from*.

### What decision 4 costs you, so it isn't a surprise later

`CREATE TABLE IF NOT EXISTS` creates a table that does not exist; it does **not** alter one that does. The moment you add a column, existing DBs silently keep the old shape and the app fails at query time, not at boot. Two cheap guards, both worth doing in M1:

- Store a `schema_version` row in `settings` and log a warning at startup if it doesn't match what the code expects.
- Keep the DDL in one module as the single source of truth, so the eventual first Alembic revision can be generated from it rather than reverse-engineered.

---

## 7. Explicitly out of scope

Listed, not done, per working rule 2:

- Auth / multi-user. Single-user, localhost-only. Any user-scoping (a `user_id` column) is a later decision, not a quiet addition now.
- Storing derived metrics. FFMI and friends stay computed — see §1.
- QR-code sync (`html5-qrcode`, `qrcode.react`) and compressed payloads (`lz-string`) — installed in `package.json` but unused; a real API makes them largely unnecessary.
- Any change under `src/`. That's M2.
- Tests. There's no test runner in this repo yet; adding pytest to the backend is worth doing but is its own decision.
- **A globally-unique row id (UUID / ULID) generated at creation time.** This is the real answer to "identity that survives across devices and export files", and it is what you'd reach for if this app ever grew true multi-device sync: `created_at` is standing in for it. Not in M1 because it doesn't help the migration (existing rows have none), it adds a column M2 would have to carry, and the single-API-owner situation after M1 makes it unnecessary. Worth knowing for the later projects on the roadmap — ULID additionally sorts by time, which is the property that makes people reach for renumbered integer ids in the first place.
