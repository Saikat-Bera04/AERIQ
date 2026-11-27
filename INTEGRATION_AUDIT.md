# AERIQ Integration Audit (Phase 0)

## Page & Component Wiring Matrix

| Page | Component | Data it needs | API route it calls now | Uses mocks? | Contract match? | Problem |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | `LandingPage` | Illustrative hero & solutions copy | None (static) | Yes (Sample allowed) | N/A | None — landing page is the allowed illustrative exception with `Sample` / `ILLUSTRATIVE READINGS · NOT LIVE DATA` labels. |
| `/login` | `LoginPage` | Auth session cookie | None (`setTimeout` -> `/dashboard`) | Yes | No | Does not call `POST /api/v1/auth/login`; no real session cookie set. |
| `/register` | `RegisterPage` | User registration + session | None (`setTimeout` -> `/onboarding`) | Yes | No | Does not call `POST /api/v1/auth/register` or `login`. |
| `/onboarding` | `OnboardingPage` | Saved locations, profile, family | None (local state only) | Yes | No | Does not call `POST /api/v1/locations`, `PATCH /api/v1/profile`, `POST /api/v1/family`. |
| `/(dashboard)` shell | `TopBar` | User initials, email, saved locations, live sync | `useLiveLocation` (local catalog when `NEXT_PUBLIC_USE_MOCKS=true`) | Yes | Partial | Imports `MOCK_USER` (`Aarav Sen`); does not fetch `GET /api/v1/me` or `GET /api/v1/locations`. |
| `/dashboard` | `DashboardPage` | Current AQI, pollutants, weather, history, forecast, daily AI rec, planner preview, simulator total, community preview | None (imports `@/mocks/data`) | Yes | No | Hardcoded `MOCK_AQI_CURRENT`, `MOCK_AI_RECOMMENDATION`, `MOCK_HISTORY_24H`, `MOCK_PLANNER_ACTIVITIES`, `MOCK_COMMUNITY_REPORTS`. |
| `/assistant` | `AssistantPage` | Conversations, messages, context strip, SSE chat stream | None (local echo reply) | Yes | No | Imports `MOCK_AQI_CURRENT`, `MOCK_USER`; does not stream `POST /api/v1/assistant/chat` or load `/api/v1/assistant/conversations`. |
| `/planner` | `PlannerPage` | Today's plan, window strip, activities, AI why-plan | None (local state from `MOCK_PLANNER_*`) | Yes | No | Does not call `GET /api/v1/planner/today`, `POST /api/v1/planner/generate`, `POST/PATCH /api/v1/planner/activities`. |
| `/family` | `FamilyPage` | Family members + todayTopTip | None (local state from `MOCK_FAMILY`) | Yes | No | Does not call `GET/POST/PATCH/DELETE /api/v1/family`. |
| `/indoor-air` | `IndoorAirPage` | Indoor profile, ventilation state, rule tips, HEPA CADR, family tips | None (local state from `MOCK_INDOOR_RECS`) | Yes | No | Does not call `GET/PUT /api/v1/indoor/profile` or `POST /api/v1/indoor/recommendations`. |
| `/simulator` | `SimulatorPage` | Emission factors, commute calc, exposure calc, saved scenarios | None (local formula + `MOCK_SIMULATOR_ASSUMPTIONS`) | Yes | Partial | Does not call `GET /api/v1/simulator/factors`, `POST /api/v1/simulator/commute`, `POST /api/v1/simulator/exposure`, `GET/POST /api/v1/simulator/scenarios`. |
| `/community` | `CommunityPage` | Nearby reports (rounded) + official stations | None (local state from `MOCK_COMMUNITY_*`) | Yes | No | Does not call `GET /api/v1/community/hotspots` or `POST /api/v1/community/reports`. |
| `/settings` | `SettingsPage` | User profile, locations, notifications, export, delete account | None (local state from `MOCK_USER`, `MOCK_LOCATIONS`) | Yes | No | Does not call `/api/v1/me`, `/api/v1/notifications`, `/api/v1/account/export`, `DELETE /api/v1/account`. |

## Hardcoded & Mock References Found

- `frontend/src/mocks/data.ts`: `USE_MOCKS = true`, `Aarav Sen`, `Kolkata`, `212`, `MOCK_*` fixtures.
- `frontend/src/components/layout/TopBar.tsx`: imports `MOCK_USER`.
- `frontend/src/hooks/useLiveLocation.ts`: `CITY_CATALOG` fallback and `NEXT_PUBLIC_USE_MOCKS !== "false"`.
- `frontend/src/app/(dashboard)/*/page.tsx`: all 8 dashboard pages import `@/mocks/data`.
- `frontend/src/app/onboarding/page.tsx`: hardcoded `CITIES` list and initial `Kolkata · Rabindra Bharati`.
- `backend/src/server/services/index.ts`: `isMocksEnabled()` returns `MOCK_*` fixtures when `USE_MOCKS !== "false"`.
- `backend/src/db/seed.ts`: seeds 3 hand-typed Kolkata stations instead of syncing from CPCB/OpenAQ.

## Missing Backend Endpoints & Features to Wire

1. `src/server/env.ts` (Zod startup env validation).
2. `gemini_usage` table in `src/db/schema.ts` + Gemini free-tier budget/caching (10/user/day, 200/app/day, 1 daily rec per user/location/category, 30-min Redis chat cache, rule-based `safety.ts` without extra Gemini call) + `/dev/gemini-usage` admin page.
3. Missing `/api/v1` endpoints: `/me`, `/profile`, `/locations` CRUD, `/aqi/history`, `/aqi/forecast`, `/weather`, `/assistant/conversations`, `/planner/generate`, `/planner/activities`, `/family`, `/indoor/profile`, `/simulator/scenarios`, `/community/hotspots`, `/notifications`, `/account/export`, `/account` (DELETE), `/admin/reports/:id/status`.
4. Frontend `src/lib/api.ts` typed envelope client (`{ ok, data, meta }` / `{ ok: false, error }`) and real API wiring on every page with `USE_MOCKS=false` & `NEXT_PUBLIC_USE_MOCKS=false`.
