# AERIQ Testing & Verification Log

## Phase 0 — Baseline Audit
- **Checked:**
  - `backend/`: `npm run typecheck && npm test`
  - `frontend/`: `npx tsc --noEmit && npm run lint`
  - Codebase scan for `USE_MOCKS`, `NEXT_PUBLIC_USE_MOCKS`, `@/mocks`, `Kolkata`, `212`, `Aarav`.
- **Results:**
  - `backend/` typecheck passed (0 errors) and Vitest passed (5 test files, 21/21 tests).
  - `frontend/` typecheck and ESLint passed (0 errors).
  - Audit recorded in `INTEGRATION_AUDIT.md`: all 8 `(dashboard)` pages, `TopBar`, `(auth)` pages, and `onboarding` currently use `@/mocks/data` or local state and are not yet wired to `/api/v1/*`.
  - `drizzle-kit push` stalled on interactive prompt for PostGIS `spatial_ref_sys` table; will add `extensionsFilters: ["postgis"]` in `backend/drizzle.config.ts` in Phase 1.

## Phase 1 — Environment, Database & Real Ingestion
- **Checked:**
  - Added `backend/src/server/env.ts` (Zod startup validation) and `gemini_usage` table in `backend/src/db/schema.ts`.
  - Added `extensionsFilters: ["postgis"]` to `backend/drizzle.config.ts`, fixed `geography` customType for Neon PostGIS, pushed schema, and seeded 7 reference `emission_factors` rows (no demo users/stations/reports).
  - Fixed `CPCB_RESOURCE_ID` (`3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69`), CPCB `avg_value` field mapping, and `DD-MM-YYYY HH:mm:ss` IST timestamp parsing in `normalise.ts`.
  - Ran `stations-sync`, `ingest-observations`, and `ingest-forecast` against Neon.
- **Results:**
  - `54` real CPCB stations synced, `129+` real `readings` rows stored with UTC `observed_at`, `aqi_snapshots` and `weather_readings` populated.
  - Set `USE_MOCKS=false` and `NEXT_PUBLIC_USE_MOCKS=false`.

## Phases 2–5 — Full Integration, Gemini Budget & Verification
- **Checked:**
  - Created `frontend/src/lib/api.ts` and wired `(auth)`, `onboarding`, `TopBar`, `useLiveLocation`, and all 8 `(dashboard)` pages + `/dev/gemini-usage` to `/api/v1/*`.
  - Implemented Gemini free-tier caps (10/user/day, 200/app/day), 30-min Redis chat cache, `gemini_usage` DB logging, and deterministic `safety.ts`.
  - Fixed PostGIS EWKB hex parsing in `backend/src/db/schema.ts`.
- **Results:**
  - `backend/`: `npm run typecheck && npm test` passed (23/23 Vitest tests).
  - `frontend/`: `npx tsc --noEmit && npm run lint && npm run build` passed (0 errors, 17/17 routes).
  - Live E2E workflow against Neon + Upstash + Gemini passed (`E2E_WORKFLOW_OK`).
