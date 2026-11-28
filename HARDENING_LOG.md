# AERIQ Hardening Log

## Phase 1 — Same-origin API and sessions (P0)
- Added `/api/:path* -> ${BACKEND_URL}/api/:path*` rewrite in `frontend/next.config.ts`.
- Switched `frontend/src/lib/api.ts` and `frontend/src/app/(dashboard)/assistant/page.tsx` to relative `/api/...` paths and attached `x-csrf-token` from `aeriq_csrf` on all mutating requests.
- Removed credentialed cross-origin CORS from `backend/src/server/http/router.ts`.
- Replaced HMAC session tokens with DB-backed 32-byte random session IDs (SHA-256 hashed in `sessions`), `HttpOnly; SameSite=Lax; Path=/` (`Secure` in production), 30-day sliding expiry, rotation on login, and revocation on logout/account delete.
- Enforced `Origin` check against `APP_URL` and double-submit `x-csrf-token === aeriq_csrf` on authenticated mutations.
- Added `backend/tests/phase1-session-csrf.test.ts`.

## Phase 2 — Scheduler, locks, health (P0)
- Added `.github/workflows/cron.yml` scheduling `health/live` (10m), `ingest-observations` (15m), `ingest-forecast` (hourly :05), `refresh-plans` (30m), `stations-sync` (20:30 UTC), and `cleanup` (21:30 UTC) with `Bearer CRON_SECRET`.
- Added `acquireLock` / `releaseLock` (`SET NX EX 600`) and `pingRedis` in `backend/src/server/lib/redis.ts`, and wrapped all 5 cron jobs in `withCronLock` returning `{ skipped: "locked" }` when locked.
- Added dependency-free `GET /health/live` and dependency-checking `GET /health` (`SELECT 1`, Redis `PING`, `provider_status` rows).
- Added a 30-second `AbortController` timeout to `frontend/src/lib/api.ts` throwing `ApiClientError(408, "TIMEOUT", ...)`.

## Phase 3 — Smart plan refresh (P0)
- Added `getIstHour()` and `shouldMarkPlanStale()` in `backend/src/server/engines/planner.ts`.
- Updated `runRefreshPlans()` in `backend/src/server/cron/jobs.ts` to rebuild hourly categories for today's remaining IST hours from stored `aqi_snapshots` and forecast `readings`, recompute `inputsHash`, and mark a plan `stale` only when an overlapping planned activity hour changes category.
- Added `backend/tests/phase3-smart-plan-refresh.test.ts` covering unchanged data, outside-hour changes, and inside-hour changes.

## Phase 4 — API, ownership and data tests (P0)
- Installed `supertest` and `@types/supertest` in `backend/`.
- Fixed `togglePlannerActivity` and `deletePlannerActivity` to return `404 NOT_FOUND` on non-owned resources, and added `DELETE /api/v1/simulator/scenarios/:id` with ownership check.
- Added `backend/tests/api/emission-factors.test.ts` and `backend/tests/api/routes.test.ts` (401 auth checks, 422 validation checks, Zod contract checks, 404 ownership checks, and `emission_factors` metadata checks).
- Updated `.github/workflows/ci.yml` to pass `TEST_DATABASE_URL` into `npm test`.

## Phase 5 — Docs alignment (P1)
- Added `GET /api/v1/aqi/forecast` returning Open-Meteo forecast points (`provider: "Open-Meteo"`, `kind: "forecast"`), kept `/api/v1/aqi/history` observations-only, and updated `frontend/src/app/(dashboard)/dashboard/page.tsx` to fetch both.
- Extended `DailyRecommendationSchema`, Gemini prompt, `AiContext` (`savedScenarios`), and `buildDeterministicDailyFallback` with `indoorAirRecommendations` and `impactExplanation` in a single Gemini call.
- Added `PATCH /api/v1/family/:id` with ownership check and wired an Edit button in `frontend/src/app/(dashboard)/family/page.tsx` reusing the existing drawer.
- Made `buildPlan` swap to indoor at `moderate` (`rank >= 3`) when `child` or `older_adult` is in the household, and added `FAMILY_INDOOR_TIPS` to `evaluateIndoorRules`.
- Added `report_flags` table and `POST /api/v1/community/reports/:id/flag` (one flag per user per report, auto-sets `status: "removed"` at 3 flags).
- Added `backend/tests/phase5-docs-alignment.test.ts`.

## Phase 6 — Provider resilience and observability (P1)
- Added `backend/src/server/providers/http.ts` with Zod schemas (`RawCpcbPayloadSchema`, `RawOpenAqPayloadSchema`, `RawOpenMeteoAqPayloadSchema`, `RawOpenMeteoWeatherPayloadSchema`), 8s timeout, 2 exponential-backoff retries, and a 5-failure / 15-minute Redis circuit breaker; wired into `cpcb.ts`, `openaq.ts`, and `openmeteo.ts`.
- Upgraded `logRoute` to emit structured JSON (`requestId`, `route`, `userIdHash`, `ms`, `status`, `code`).
- Added optional `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` reporting in `backend/src/server/lib/sentry.ts` and `frontend/src/lib/sentry.ts` (no-op when unset).
- Added `backend/drizzle/0001_indexes_and_flags.sql` and schema index definitions, and updated `.github/workflows/cd.yml` to run `npx drizzle-kit migrate`.
- Added `backend/tests/phase6-provider-resilience.test.ts`.

## Phase 7 — Auth extras (P1)
- Added 5-failed-attempt / 15-minute Redis login lockout in `loginUser` (`auth:fail:*` + `auth:lock:*`).
- Added `POST /api/v1/auth/forgot` (always returns `200`, stores SHA-256 hashed single-use 30-min token in `verification_tokens`, sends via Resend when `RESEND_API_KEY` is set) and `POST /api/v1/auth/reset` (updates password hash, consumes token, revokes all user sessions).
- Added `/forgot-password` and `/reset-password` pages and wired the `Forgot password?` link in `frontend/src/app/(auth)/login/page.tsx`.
- Added `backend/tests/phase7-auth-extras.test.ts`.

## Phase 8 — Advisory engine (product)
- Created `backend/src/server/engines/advisory.ts` mapping `category × freshness × lifestyle × ageGroup × activity` to deterministic action codes and fixed English text.
- Returned `advisories` from `GET /api/v1/aqi/current`, passed `advisories` / `advisoryCodes` into `AiContext`, and used them in `buildDeterministicDailyFallback`.
- Updated `frontend/src/app/(dashboard)/dashboard/page.tsx` `AqiCurrentDto` to accept `advisories`.
- Added `backend/tests/phase8-advisory.test.ts` verifying every rule in `ADVISORY_RULES`.
