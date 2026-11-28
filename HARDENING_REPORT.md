# AERIQ Hardening & Docs Alignment Report

## Summary Table

| Phase / Item | Status | Files Changed / Added | Test Proving It |
|---|---|---|---|
| **1.1** Next.js `/api/:path*` rewrite & relative `/api/v1/...` fetches | Done | `frontend/next.config.ts`, `frontend/src/lib/api.ts`, `frontend/src/app/(dashboard)/assistant/page.tsx` | `frontend npx tsc --noEmit && npm run lint && npm run build` |
| **1.2** DB-backed 32-byte random sessions (SHA-256 hash), 30d sliding expiry, login rotation, logout/reset/delete revocation | Done | `backend/src/server/lib/privacy.ts`, `backend/src/server/http/router.ts` | `backend/tests/phase1-session-csrf.test.ts` |
| **1.3** CSRF (`Origin === APP_URL` + `x-csrf-token === aeriq_csrf` double-submit) & removal of credentialed CORS | Done | `backend/src/server/http/router.ts`, `frontend/src/lib/api.ts`, `frontend/src/app/(dashboard)/assistant/page.tsx` | `backend/tests/phase1-session-csrf.test.ts` |
| **2.1** GitHub Actions cron scheduler (`cron.yml`) | Done | `.github/workflows/cron.yml` | Verified YAML & endpoint paths against `router.ts` |
| **2.2** Redis cron locks (`SET NX EX 600` -> `{ skipped: "locked" }`) | Done | `backend/src/server/lib/redis.ts`, `backend/src/server/cron/jobs.ts` | `backend/tests/phase2-health-lock.test.ts` |
| **2.3** `/health/live` (no deps) & `/health` (DB `SELECT 1`, Redis `PING`, `provider_status`) | Done | `backend/src/server/http/router.ts`, `backend/src/server/lib/redis.ts` | `backend npm run build` |
| **2.4** Frontend API client 30s timeout -> `ErrorCard` | Done | `frontend/src/lib/api.ts` | `frontend npx tsc --noEmit && npm run build` |
| **3** Smart `refresh-plans` (stale only when overlapping planned hour changes category) | Done | `backend/src/server/engines/planner.ts`, `backend/src/server/cron/jobs.ts` | `backend/tests/phase3-smart-plan-refresh.test.ts` |
| **4** API, ownership (`404`), Zod contract & `emission_factors` integration tests + CI | Done | `backend/tests/api/routes.test.ts`, `backend/tests/api/emission-factors.test.ts`, `backend/src/server/services/index.ts`, `backend/src/server/http/router.ts`, `.github/workflows/ci.yml` | `backend/tests/api/emission-factors.test.ts` (`routes.test.ts` runs when `TEST_DATABASE_URL` is set) |
| **5.1** `GET /api/v1/aqi/forecast`, observations-only `/aqi/history`, dashboard chart calling both | Done | `backend/src/contracts/aqi.ts`, `backend/src/server/services/index.ts`, `backend/src/server/http/router.ts`, `frontend/src/app/(dashboard)/dashboard/page.tsx` | `backend npm run build && frontend npm run build` |
| **5.2** Extended `/assistant/recommend` schema, prompt & fallback (1 Gemini call) | Done | `backend/src/contracts/ai.ts`, `backend/src/server/ai/context.ts`, `backend/src/server/ai/gemini.ts`, `backend/src/mocks/fixtures.ts` | `backend/tests/phase5-docs-alignment.test.ts` |
| **5.3** `PATCH /api/v1/family/:id` + Edit action in `/family` drawer | Done | `backend/src/server/services/index.ts`, `backend/src/server/http/router.ts`, `frontend/src/app/(dashboard)/family/page.tsx` | `backend npm run build && frontend npm run build` |
| **5.4** Family-aware planner (`Moderate+` indoor swap) & indoor tips (`child` / `older_adult`) | Done | `backend/src/server/engines/planner.ts`, `backend/src/server/engines/indoor.ts`, `backend/src/server/services/index.ts` | `backend/tests/phase5-docs-alignment.test.ts` |
| **5.5** `POST /api/v1/community/reports/:id/flag` (`report_flags` table, auto-remove at 3) | Done | `backend/src/db/schema.ts`, `backend/drizzle/0001_indexes_and_flags.sql`, `backend/src/server/services/index.ts`, `backend/src/server/http/router.ts` | `backend npm run build` |
| **6.1–6.2** Provider Zod schemas, 8s timeout, 2 retries with backoff, Redis circuit breaker | Done | `backend/src/server/providers/http.ts`, `cpcb.ts`, `openaq.ts`, `openmeteo.ts` | `backend/tests/phase6-provider-resilience.test.ts` |
| **6.3** Structured JSON logs (`requestId, route, userIdHash, ms, status, code`) & optional Sentry | Done | `backend/src/server/lib/envelope.ts`, `backend/src/server/lib/sentry.ts`, `frontend/src/lib/sentry.ts`, `router.ts`, `api.ts` | `backend/tests/phase1-session-csrf.test.ts` stdout JSON logs |
| **6.4** CD `drizzle-kit migrate` & DB indexes (`readings`, `stations`, `community_reports`, `plans`, `messages`) | Done | `backend/drizzle/0001_indexes_and_flags.sql`, `backend/src/db/schema.ts`, `.github/workflows/cd.yml` | `backend npm run build` |
| **7.1–7.2** 5-attempt / 15-min login lockout, `/auth/forgot` & `/auth/reset` (Resend optional), `/forgot-password` & `/reset-password` pages | Done | `backend/src/contracts/auth.ts`, `backend/src/server/services/index.ts`, `router.ts`, `frontend/src/app/(auth)/forgot-password/page.tsx`, `reset-password/page.tsx`, `login/page.tsx` | `backend/tests/phase7-auth-extras.test.ts` |
| **8** Deterministic advisory engine (`advisory.ts`), `/aqi/current` advisories, Gemini context & fallback | Done | `backend/src/server/engines/advisory.ts`, `backend/src/server/ai/context.ts`, `gemini.ts`, `services/index.ts`, `frontend/src/app/(dashboard)/dashboard/page.tsx` | `backend/tests/phase8-advisory.test.ts` |

---

## New Environment Variables Added to `.env.example`

- **`backend/.env.example`**:
  - `APP_URL=http://localhost:3000` (used for CSRF `Origin` validation and password-reset links)
  - `TEST_DATABASE_URL=` (optional Postgres URI for `backend/tests/api/routes.test.ts` in CI/local)
  - `GEMINI_DAILY_CAP=200` (daily app-wide Gemini call cap)
  - `SENTRY_DSN=` (optional; Sentry error reporting is a no-op when unset)
  - `RESEND_API_KEY=` (optional; sends password-reset emails via Resend when set)
- **`frontend/.env.example`**:
  - `BACKEND_URL=http://localhost:4000` (used by `next.config.ts` `/api/:path*` rewrite)
  - `NEXT_PUBLIC_SENTRY_DSN=` (optional; client-side Sentry reporting is a no-op when unset)

---

## Items Needing Your Decision / Action

1. **GitHub Actions Secrets**: Set `BACKEND_URL` and `CRON_SECRET` in GitHub Repository Secrets so `.github/workflows/cron.yml` can trigger Render cron endpoints and `/health/live`; optionally set `TEST_DATABASE_URL` for CI integration tests and `DATABASE_URL` for CD `drizzle-kit migrate`.
2. **Vercel & Render Env Vars**:
   - In **Vercel**: set `BACKEND_URL` to your Render backend URL (e.g., `https://aeriq.onrender.com`) so the same-origin `/api/:path*` rewrite works in production.
   - In **Render**: set `APP_URL` to your Vercel URL (e.g., `https://aeriq-silk.vercel.app`) for CSRF `Origin` checks and password-reset links.
3. **Database Migration**: Run `npx drizzle-kit migrate` (or apply `backend/drizzle/0001_indexes_and_flags.sql`) against your Neon database to create `report_flags` and the new indexes.
