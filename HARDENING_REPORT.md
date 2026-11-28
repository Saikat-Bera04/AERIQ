# AERIQ Hardening & Verification Report

## Summary Table

| Phase / Item | Status | Files Changed / Added | Test / Check Proving It |
|---|---|---|---|
| **1.1** Next.js `/api/:path*` rewrite & relative `/api/v1/...` fetches (0 server-side `fetch` calls) | Done | `frontend/next.config.ts`, `frontend/src/lib/api.ts`, `frontend/src/app/(dashboard)/assistant/page.tsx` | Verified via `rg -n "fetch\(" frontend/src` (all 3 calls browser-only) + `frontend npx tsc --noEmit && npm run lint` |
| **1.2** DB-backed 32-byte random sessions (SHA-256 hash), 30d sliding expiry, login rotation, logout/reset/delete revocation | Done | `backend/src/server/lib/privacy.ts`, `backend/src/server/http/router.ts` | `backend/tests/phase1-session-csrf.test.ts` (`login sets HttpOnly SameSite=Lax session cookie (stored as SHA-256 hash) and CSRF cookie; logout revokes it`) |
| **1.3** CSRF (`Origin === APP_URL` or `ALLOWED_PREVIEW_ORIGIN` regex + `x-csrf-token === aeriq_csrf`, `/api/cron/*` & `GET/HEAD/OPTIONS` exempt) | Done | `backend/src/server/http/router.ts`, `backend/src/server/env.ts`, `frontend/src/lib/api.ts` | `backend/tests/verify-hardening.test.ts` (`cron POST with no Origin + valid bearer -> 200; wrong bearer -> 401`, `browser POST from ALLOWED_PREVIEW_ORIGIN is allowed; disallowed origin -> 403`) + `phase1-session-csrf.test.ts` |
| **1.4** Cookie attributes (`no Domain`, `Path=/`, `SameSite=Lax`, `Secure` only in production) | Done | `backend/src/server/http/router.ts` | `backend/tests/verify-hardening.test.ts` (`Set-Cookie has no Domain, Path=/, SameSite=Lax, and Secure only in production`) |
| **2.1** GitHub Actions cron scheduler (`cron.yml`) | Partial (not dispatched) | `.github/workflows/cron.yml` | Blocked locally: `gh` CLI not installed (`gh not found`) |
| **2.2** Redis cron locks (`SET NX EX 600` -> `{ skipped: "locked" }`) | Done | `backend/src/server/lib/redis.ts`, `backend/src/server/cron/jobs.ts` | `backend/tests/phase2-health-lock.test.ts` (`acquireLock prevents concurrent acquisition until released`, `withCronLock returns { skipped: 'locked' } when locked`) |
| **2.3** `/health/live` (200 no DB) & `/health` (503 when DB down) | Done | `backend/src/server/http/router.ts`, `backend/src/server/lib/redis.ts` | `backend/tests/verify-hardening.test.ts` (`/health/live returns 200 with no DB; /health returns 503 when DB is down`) |
| **2.4** Frontend API client 30s timeout -> `ErrorCard` | Done | `frontend/src/lib/api.ts` | `frontend npx tsc --noEmit && npm run lint` |
| **3** Smart `refresh-plans` (stale only when overlapping planned hour changes category) | Done | `backend/src/server/engines/planner.ts`, `backend/src/server/cron/jobs.ts` | `backend/tests/phase3-smart-plan-refresh.test.ts` (3 tests: unchanged, outside-hour, inside-hour) |
| **4** API, ownership (`404`), Zod contract & `emission_factors` integration tests + CI | Partial (`TEST_DATABASE_URL` missing locally) | `backend/tests/api/routes.test.ts`, `backend/tests/api/emission-factors.test.ts`, `.github/workflows/ci.yml` | `backend/tests/api/emission-factors.test.ts` passed; `backend/tests/api/routes.test.ts` skipped locally because `TEST_DATABASE_URL` is not set |
| **5.1** `GET /api/v1/aqi/forecast` (`kind: "forecast"`, `provider: "Open-Meteo"`) & observations-only `/aqi/history` | Done | `backend/src/contracts/aqi.ts`, `backend/src/server/services/index.ts`, `router.ts`, `dashboard/page.tsx` | `backend/tests/verify-hardening.test.ts` (`GET /api/v1/aqi/forecast returns kind='forecast' & provider='Open-Meteo'; /aqi/history returns observations only`) |
| **5.2** Extended `/assistant/recommend` schema, prompt & fallback (1 Gemini call) | Done | `backend/src/contracts/ai.ts`, `context.ts`, `gemini.ts`, `mocks/fixtures.ts` | `backend/tests/phase5-docs-alignment.test.ts` (`DailyRecommendationSchema & fallback include all extended fields`) |
| **5.3** `PATCH /api/v1/family/:id` (owner `200`, other user `404`) + Edit drawer on `/family` | Done | `backend/src/server/services/index.ts`, `router.ts`, `frontend/src/app/(dashboard)/family/page.tsx` | `backend/tests/verify-hardening.test.ts` (`PATCH /api/v1/family/:id succeeds for owner and returns 404 for another user`) |
| **5.4** Family-aware planner (`Moderate+` indoor swap) & indoor tips (`child` / `older_adult`) | Done | `backend/src/server/engines/planner.ts`, `indoor.ts`, `services/index.ts` | `backend/tests/phase5-docs-alignment.test.ts` (2 tests: vulnerable swap, indoor family tips) |
| **5.5** `POST /api/v1/community/reports/:id/flag` (owner `403`, dup `422`, 3rd user `removed`) | Done | `backend/src/db/schema.ts`, `services/index.ts`, `router.ts` | `backend/tests/verify-hardening.test.ts` (`flagging: owner cannot flag own report (403); duplicate flag counts once (422); 3rd distinct user removes report`) |
| **6.1–6.2** Provider Zod schemas, 8s timeout, 2 retries with backoff, Redis circuit breaker | Done | `backend/src/server/providers/http.ts`, `cpcb.ts`, `openaq.ts`, `openmeteo.ts` | `backend/tests/phase6-provider-resilience.test.ts` (2 tests) |
| **6.3** Structured JSON logs & optional Sentry | Done | `backend/src/server/lib/envelope.ts`, `sentry.ts`, `frontend/src/lib/sentry.ts` | Observed JSON logs in `phase1-session-csrf.test.ts` & `verify-hardening.test.ts` |
| **6.4** Drizzle migrations (`_journal.json` + snapshots) & DB indexes (`pg_indexes`) | Partial (migration generated; live DB run blocked on `TEST_DATABASE_URL`) | `backend/drizzle/0000_postgis.sql`, `0001_schema.sql`, `0002_indexes_and_flags.sql`, `drizzle/meta/_journal.json` | `drizzle-kit generate` succeeded for all 3 migrations; `pg_indexes` assertion added to `routes.test.ts` (awaiting `TEST_DATABASE_URL`) |
| **7.1–7.2** 5-attempt / 15-min login lockout, `/auth/forgot` & `/auth/reset` | Done | `backend/src/contracts/auth.ts`, `services/index.ts`, `router.ts`, `forgot-password/page.tsx`, `reset-password/page.tsx` | `backend/tests/phase7-auth-extras.test.ts` (2 tests) |
| **8** Deterministic advisory engine (`advisory.ts`), `/aqi/current` advisories, Gemini context & fallback | Done | `backend/src/server/engines/advisory.ts`, `context.ts`, `gemini.ts`, `services/index.ts` | `backend/tests/phase8-advisory.test.ts` (covers every rule in `ADVISORY_RULES`) |

---

## New Environment Variables Added to `.env.example`

- **`backend/.env.example`**:
  - `APP_URL=http://localhost:3000`
  - `ALLOWED_PREVIEW_ORIGIN=` (regex, e.g. `^https://aeriq-.*\.vercel\.app$`)
  - `TEST_DATABASE_URL=`
  - `GEMINI_DAILY_CAP=200`
  - `SENTRY_DSN=`
  - `RESEND_API_KEY=`
- **`frontend/.env.example`**:
  - `BACKEND_URL=http://localhost:4000`
  - `NEXT_PUBLIC_SENTRY_DSN=`

---

## Blockers / Items Needing Your Input

1. **`TEST_DATABASE_URL`**: Not present in `backend/.env` or shell environment. Add your Neon test branch connection string to `backend/.env` (or pass it) so we can run `drizzle-kit migrate` (on empty DB + schema copy) and execute `backend/tests/api/routes.test.ts` (including `pg_indexes` and all ownership checks).
2. **`cron.yml` `workflow_dispatch`**: `gh` CLI is not installed locally (`gh not found`), and the hardened backend routes (`/health/live`, etc.) need to be pushed to Render before running all `cron.yml` jobs against the deployed backend.
