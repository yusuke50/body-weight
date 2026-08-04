# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working rules

1. **Before writing any code, list the affected files and components and wait for my confirmation.** Planning, listing, and writing docs are fine without confirmation — only implementation needs the checkpoint. (動手寫 code 前先列出受影響的檔案與元件,等我確認再實作。)
2. **Two milestones. M1 is backend only — do not touch the `src/` frontend. M2 is wiring the two together, and nothing else.** Suggestions outside the current milestone should be listed, not implemented. (超出當前 milestone 範圍的建議,列出來但不要做。)
3. **Every piece of new backend code gets a comment.** (每一段新增的後端程式碼都要加上註解。)

### What "backend" means here

The existing `src/services/` + `src/hooks/` localStorage layer is **not** the backend — it is part of the frontend app. The backend is a **new, separate Python (FastAPI) + SQLite service** this side project is being used to practice, living outside `src/`. Design lives in [docs/backend-spec.md](docs/backend-spec.md); it is a spec only and nothing is implemented yet.

So: M1 = build that Python service. M2 = point the frontend at it.

## Commands

```bash
npm run dev      # start Vite dev server at http://localhost:5173
npm run build    # type-check (tsc -b) then Vite production build to dist/
npm run lint     # ESLint over the repo
npm run preview  # serve the production build
```

There is no test framework configured — no test runner or test files exist. `npm run build` (which runs `tsc -b`) is the type-safety gate; run it to verify TypeScript compiles.

## Architecture

Single-page React 19 + TypeScript app (Vite, TailwindCSS v4, Chart.js). No backend and no router — `App.tsx` switches between four views (`dashboard | charts | data | settings`) via local `useState`. All data lives in the browser's **localStorage**; nothing is uploaded.

### Data layer (three stacked tiers — keep the boundaries)

1. **`services/database.ts`** — the only module that touches `localStorage`. Reads/writes two keys: `bodyweight_db_v2` (an array of records) and `bodyweight_settings` (a key→value object). Despite the name, everything is synchronous JSON serialization of the whole array on every read/write.
2. **`services/dataService.ts`** — CRUD and query helpers over that array (add/update/delete/get, sorting, date-range filter, dedup check, settings get/set). New record IDs are computed as `max(existing ids) + 1`, not a DB sequence. `exportService.ts` builds on this for JSON export/import, clipboard, and file I/O.
3. **`hooks/`** — React state wrappers that call the services and expose them to components: `useDatabase` (one-time init), `useRecords` (records + derived `latestRecord`/`previousRecord` + range filter), `useProfile` (height setting).

Components never import `database.ts` or `localStorage` directly — always go through a hook or a service.

> Note: `package.json` includes `sql.js`, `html5-qrcode`, `qrcode.react`, and `lz-string`, but the current data layer is pure localStorage and none of these are wired in. Treat them as unused/aspirational unless you're implementing that feature.

### Settings quirk

Settings values are **JSON-stringified before storage** (`setSetting(key, JSON.stringify(value))`) and parsed on read (`getAllSettings` / `useProfile`). When adding a setting, follow this stringify-on-write / parse-on-read convention or values will double-encode.

### Domain model

`types/index.ts` is the source of truth. Core entity is `BodyRecord` (`date` as ISO string, `weight` in kg required; `body_fat_percentage`, `water_percentage`, `muscle_mass`, `notes` optional). Derived metrics (net/lean weight, body-fat weight, FFMI) are computed on the fly in `utils/calculations.ts` — they are never stored. FFMI needs the user's height from profile settings and defaults height to 180cm if unset.

### Import/export & dedup

Cross-device sync is manual JSON export/import (file download or clipboard) — see `exportService.ts`. On import, duplicates are detected by `checkRecordExists(date, weight, tolerance)` — same `date` and weight within 0.1kg — and skipped. There is no true primary key beyond this heuristic.

## Conventions

- **UI language is Traditional Chinese** — user-facing strings in components are hardcoded zh-TW (e.g. 體重, 體脂率, 筋肉量, 含水量). Match this when adding UI text. Code, comments, and type names are English.
- Dates: use the helpers in `utils/dateUtils.ts`. Local-time conversion (`toLocalDateTimeString`) is used so `datetime-local` inputs and stored timestamps stay in the user's timezone — don't substitute raw `toISOString()`.
- Numbers are formatted via `formatNumber` (Intl `zh-TW`, 2 decimals by default).
