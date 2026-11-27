# AERIQ Integration & Test Report

## Module Status Table

| Module | Status | What was wrong | What you changed | Test that proves it |
| --- | --- | --- | --- | --- |
| Environment & DB (`env.ts`, `schema.ts`, `seed.ts`) | Fixed | Missing Zod startup env check; `drizzle-kit` prompted on PostGIS `spatial_ref_sys`; `geography(Point, 4326)` quoted by Drizzle; EWKB hex returned `{ lat: 0, lng: 0 }`; hand-typed stations seeded. | Added `backend/src/server/env.ts`; added `extensionsFilters: ["postgis"]`, `geography` type + EWKB hex parser in `schema.ts`; seeded only `emission_factors`; added `gemini_usage` table. | `npm run db:seed`, `stations-sync`, `ingest-observations`, E2E DB round-trip. |
| Providers & Normaliser (`cpcb.ts`, `normalise.ts`, `cron/jobs.ts`) | Fixed | CPCB `data.gov.in` uses `avg_value` and `DD-MM-YYYY HH:mm:ss` IST timestamps; sequential inserts were slow. | Updated `normalise.ts` for `DD-MM-YYYY HH:mm:ss` IST → UTC, `jobs.ts` for `avg_value` and batch upserts; `54` CPCB stations and `129+` real readings ingested. | `tests/normalise.test.ts` (2/2), live `stations-sync` + `ingest-observations`. |
| AQI & Freshness Engines (`aqi.ts`, `freshness.ts`) | Working | Verified all CPCB rules & continuous bands. | Kept pure deterministic logic; added freshness boundary tests (`89`, `91`, `179`, `181` min). | `tests/aqi.test.ts` (8/8), `tests/ai.test.ts` (freshness). |
| Gemini Free-Tier Layer (`gemini.ts`, `safety.ts`) | Fixed | Safety check used an extra Gemini call; no daily cap, no `gemini_usage` logging, no 30-min chat cache, no quota-error no-retry guard. | Replaced safety check with deterministic rules (`safety.ts`); added `gemini_usage` table, Redis 10/user/day + 200/app/day budgets, 30-min chat cache, 600-token cap, no-retry on 429, and `/dev/gemini-usage` admin page. | `tests/ai.test.ts` (5/5), live E2E `/assistant/recommend` + `/assistant/chat` SSE. |
| Auth & Profile (`/login`, `/register`, `/onboarding`, `/settings`) | Fixed | Pages used local `setTimeout` and `MOCK_USER`. | Created `frontend/src/lib/api.ts`; wired `register`, `login`, `logout`, `me`, `profile`, `locations`, `notifications`, `export`, `delete account`. | Live E2E workflow (`401` -> `register` -> `me` -> `onboarding` -> `export` -> `delete`). |
| Dashboard & Live Location (`/dashboard`, `TopBar`, `useLiveLocation.ts`) | Fixed | Imported `MOCK_AQI_CURRENT`, `MOCK_USER`, hardcoded `212` / `Kolkata`. | Wired to `/api/v1/aqi/current`, `/aqi/history`, `/assistant/recommend` (0 Gemini calls on load), `/planner/today`, `/simulator/scenarios`, `/community/hotspots`, `/locations/sync`. | `frontend/` `npm run build` (17/17 pages), live E2E `/aqi/current`. |
| Assistant (`/assistant`) | Fixed | Local echo reply with `MOCK_AQI_CURRENT`. | Wired to `/api/v1/assistant/conversations` and `/api/v1/assistant/chat` SSE (`context`, `safety`, `delta`, `structured`, `done`). | Live E2E `/assistant/chat` SSE with `health_symptom` flag. |
| Planner, Family & Indoor Air | Fixed | Local mock state on all three pages. | Wired to `/api/v1/planner/*`, `/api/v1/family/*`, `/api/v1/indoor/*` (rule-based tips + deterministic CADR). | `tests/engines.test.ts` (5/5), live E2E `/planner/today`, `/indoor/recommendations`. |
| Simulator & Community (`/simulator`, `/community`) | Fixed | Local calculation & mock reports. | Wired to `/api/v1/simulator/*` (emissions & exposure separated) and `/api/v1/community/*` (500 m rounding). | `tests/contracts.test.ts` (3/3), live E2E `/simulator/commute`, `/simulator/exposure`, `/community/reports`. |

## Gemini Free-Tier Budget & Usage Summary
- **Page load (`GET /dashboard`, `GET /planner`)**: `0` Gemini calls (reads cached DB recommendation or deterministic fallback).
- **Daily recommendation**: At most `1` Gemini call per user/location/AQI category (`Refresh` rate-limited to `3/day`).
- **Safety classification**: `0` Gemini calls (deterministic keyword/pattern rules in `src/server/ai/safety.ts`).
- **Chat**: `1` Gemini call per unique question/context (last 6 messages, `600` max output tokens, `30`-minute Redis cache).
- **E2E Run**: `1` chat call (`health_symptom` flagged deterministically), `0` recommendation calls on initial dashboard load.

## Checks Executed
- `backend/`: `npm run typecheck && npm test` — **0 TypeScript errors, 5/5 test files, 23/23 Vitest tests passed**.
- `frontend/`: `npx tsc --noEmit && npm run lint && npm run build` — **0 TypeScript errors, 0 ESLint errors, 17/17 Next.js routes built**.
- **Live E2E API Workflow**: Verified against Neon PostgreSQL + PostGIS + Upstash Redis + Google Gemini (`E2E_WORKFLOW_OK`).

## Remaining Human Decisions
1. **Severe-band AQI upper concentrations** in `backend/src/server/engines/aqi-breakpoints.ts` should be verified against the official CPCB NAQI technical report (2014) before production launch.
2. **Emission-factor sources** in `backend/src/mocks/fixtures.ts` (seeded into `emission_factors`) should be reviewed against your preferred India GHG Program / metro operator citation.
3. **Admin moderator emails**: Populate `ADMIN_EMAILS` in `backend/.env` for `/api/v1/admin/reports/:id/status` and `/dev/gemini-usage`.
