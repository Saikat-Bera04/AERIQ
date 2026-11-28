# AERIQ — Complete Project Implementation Reference

**AERIQ** ("Intelligence for Every Breath") is a full-stack environmental intelligence and personal air-quality planning web application. It separates **deterministic calculations** (CPCB NAQI scoring, commute CO2e emissions, indoor purifier CADR, activity scheduling) from **Gemini AI explanations** (plain-language guidance grounded strictly in validated context).

---

## 1. Tech Stack & Architecture

| Layer | Technology |
|---|---|
| **Frontend** | Next.js `16.4.6` (App Router, React `19.3.0`, TypeScript), Tailwind CSS v4, Recharts `3.11.1`, Leaflet `1.9.4`, Lucide icons, Motion |
| **Backend** | Node.js HTTP server (`tsx`, TypeScript), custom router (`backend/src/server/http/router.ts`), Zod `3.24.2` |
| **Database** | PostgreSQL (Neon) + PostGIS (`geography(Point, 4326)`) + Drizzle ORM `0.41.0` |
| **Cache & Rate Limiting** | Upstash Redis (`@upstash/redis`, `@upstash/ratelimit`) |
| **AI** | Google Gemini (`@google/genai`, default `gemini-2.5-flash`) |
| **External Data APIs** | CPCB via `data.gov.in`, OpenAQ v3, Open-Meteo (Air Quality + Weather Forecast) |
| **Testing** | Vitest `3.1.1` (backend unit/engine/contract tests) |
| **CI/CD & Hosting** | GitHub Actions (`ci.yml`, `cd.yml`), Vercel (frontend), Render (backend) |

---

## 2. Database Schema (`backend/src/db/schema.ts`)

### Accounts, Auth & User Context
- `users`: UUID primary key, `email`, `passwordHash`, `name`, `role` (`user`), `avatarColour`, `emailVerified`, timestamps.
- `sessions`, `accounts`, `verification_tokens`: Auth.js / Drizzle adapter tables.
- `profiles`: `lifestyle` (`student | professional | homemaker | retired | other`), `transportModes[]`, `activities` (JSONB), `units`, `language`, `onboardedAt`.
- `locations`: User-saved locations with `label`, `city`, exact `point` and privacy-rounded `roundedPoint` (`geography`), `isDefault`, `nearestStationId`.
- `family_members`: Household members with `name`, `ageGroup` (`child | teen | adult | older_adult`), `lifestyle`, `activities`.
- `notification_prefs`: `dailySummary`, `categoryChangeAlerts`, `planChangedAlerts`, `quietStart`, `quietEnd`.
- `indoor_profiles`: `cookingFuel` (`lpg | wood | electric | other`), `incense`, `indoorSmoking`, `pets`, `constructionNearby`, `hasPurifier`, `roomSizeM2`.

### Air Quality, Weather & Providers
- `stations`: Monitoring stations (`provider`: `cpcb | openaq | openmeteo`, `providerStationId`, `name`, `city`, `state`, `point`, `active`).
- `readings`: Normalized pollutant readings (`pm25`, `pm10`, `no2`, `o3`, `so2`, `co`, `nh3`, `pb`), `value` (`numeric(10,3)`), `unit`, `averaging` (`hourly | 8h | 24h | instant`), `observedAt`, `kind` (`observation | forecast`), `rawHash`.
- `weather_readings`: Open-Meteo weather (`tempC`, `rhPct`, `windKph`, `windDirDeg`, `precipMm`, `observedAt`, `kind`).
- `aqi_snapshots`: Computed CPCB AQI (`aqi`, `category`, `dominantPollutant`, `subIndices` JSONB, `unavailableReason`, `engineVersion`, `windowEnd`).
- `provider_status`: Health tracking per provider (`lastSuccessAt`, `lastErrorAt`, `lastErrorCode`, `consecutiveFailures`).

### AI, Planner, Simulator, Community & Audit
- `conversations` & `messages`: AI chat history with `structured` JSONB, `contextSnapshot`, `safetyFlag` (`none | health_symptom | emergency`), `model`.
- `recommendations`: Cached daily/refreshed Gemini guidance (`kind`: `daily | refresh`, `payload`, `contextSnapshot`, `dataAsOf`).
- `plans` & `plan_activities`: Daily adaptive plans (`inputsHash`, `status`: `current | stale`) and scheduled activities (`start`, `end`, `setting`: `outdoor | indoor`, `expectedAqi`, `indoorAlternative`, `completedAt`, `userAdded`).
- `emission_factors` & `simulator_scenarios`: Transport CO2e factors (`kgCo2ePerPkm`, `source`, `publication`, `version`, `geography`, `occupancyAssumption`) and saved user scenarios.
- `community_reports`: User-submitted pollution reports (`smoke | dust | burning_waste | vehicle_exhaust | industrial | other`, `description` max 280 chars, `roundedPoint`, `status`: `pending | verified | not_verified | removed`, `flagCount`).
- `audit_log` & `gemini_usage`: Action audit trail and Gemini token/cache metrics (`route`, `userIdHash`, `model`, `tokensIn`, `tokensOut`, `cacheHit`).

---

## 3. Backend API Routes (`backend/src/server/http/router.ts`)

All responses use a standard JSON envelope (`okEnvelope` / `errorEnvelope`), 64 KB max body size, Zod validation (`422` on schema errors), security headers, CORS with credentials, and signed `aeriq_session` HTTP-only cookies.

### Health & Cron
- `GET /` and `GET /health` — Service health check.
- `POST/GET /api/cron/stations-sync` — Sync active CPCB stations (`Bearer CRON_SECRET`).
- `POST/GET /api/cron/ingest-observations` — Ingest CPCB + OpenAQ observations and recompute `aqi_snapshots`.
- `POST/GET /api/cron/ingest-forecast` — Ingest Open-Meteo weather & air quality forecasts.
- `POST/GET /api/cron/refresh-plans` — Mark `current` plans as `stale`.
- `POST/GET /api/cron/cleanup` — Prune old readings/forecasts and expired sessions.

### Auth & Account
- `POST /api/v1/auth/register` — Register account (rate limited: 10 req / 15 min per IP), sets session cookie.
- `POST /api/v1/auth/login` — Email/password login (`bcryptjs`), sets session cookie.
- `POST /api/v1/auth/logout` — Clears session cookie.
- `GET /api/v1/me` — Current user, profile, locations, onboarding status.
- `PATCH /api/v1/profile` — Update lifestyle, transport modes, activities, onboarding completion.
- `GET /api/v1/notifications` / `PUT /api/v1/notifications` — Read/update notification preferences.
- `GET /api/v1/account/export` — Export all user data as JSON.
- `DELETE /api/v1/account` — Delete account and clear cookie.

### Locations & Air Quality
- `GET /api/v1/locations`, `POST /api/v1/locations`, `PATCH /api/v1/locations/:id`, `DELETE /api/v1/locations/:id` — Manage saved locations.
- `POST /api/v1/locations/sync` — Sync live browser coordinates (rounded to ~500m) to nearest station.
- `GET /api/v1/aqi/current` — Current CPCB AQI, latest pollutant readings, weather, station info, and provider outage notices (cached in Redis `aqi:current:<stationId>`).
- `GET /api/v1/aqi/history?range=24h|7d|30d` — Historical observed + forecast AQI series.
- `GET /api/v1/weather?hours=12` — Weather observations/forecast.

### AI Assistant (`Gemini`)
- `POST /api/v1/assistant/recommend` — Daily personalized guidance (`commute`, `study`, `exercise`); `force: true` refresh rate-limited to 3/day.
- `POST /api/v1/assistant/chat` — Server-Sent Events (SSE) streaming chat (`context`, `safety`, `delta`, `structured`, `done` events), rate-limited to 30/hour.
- `GET /api/v1/assistant/conversations`, `GET /api/v1/assistant/conversations/:id`, `DELETE /api/v1/assistant/conversations/:id` — Conversation history management.
- `GET /api/v1/dev/gemini-usage` — Admin Gemini usage & cache hit stats.

### Planner, Family & Indoor Coach
- `GET /api/v1/planner/today` — Fetch or build today's adaptive plan.
- `POST /api/v1/planner/generate` — Force-regenerate today's plan (12/hour limit).
- `POST /api/v1/planner/activities` — Add custom activity.
- `PATCH /api/v1/planner/activities/:id`, `DELETE /api/v1/planner/activities/:id` — Toggle completion or delete activity.
- `GET /api/v1/family`, `POST /api/v1/family`, `DELETE /api/v1/family/:id` — Manage family members.
- `GET /api/v1/indoor/profile`, `PUT /api/v1/indoor/profile` — Read/save home environment settings.
- `POST /api/v1/indoor/recommendations` — Evaluate deterministic indoor air rules & HEPA CADR guidance.

### Simulator & Community
- `GET /api/v1/simulator/factors` — List documented transport emission factors.
- `POST /api/v1/simulator/commute` — Run commute CO2e comparison (60/hour limit).
- `POST /api/v1/simulator/exposure` — Run exposure planning indicator (`µg/m³·h`).
- `GET /api/v1/simulator/scenarios`, `POST /api/v1/simulator/scenarios` — List/save scenarios.
- `GET /api/v1/community/hotspots` — Fetch stations & community reports within radius.
- `POST /api/v1/community/reports` — Submit report (5/day limit, strips URLs/emails/phones, rounds coordinates).
- `DELETE /api/v1/community/reports/:id` — Delete own report.
- `POST /api/v1/admin/reports/:id/status` — Moderate report status.

---

## 4. Deterministic Engines (`backend/src/server/engines/`)

- **CPCB NAQI Engine (`aqi.ts`, `aqi-breakpoints.ts`, version `cpcb-naqi-2014.1`)**:
  - Implements India's CPCB 6-band scale (`good` 0–50, `satisfactory` 51–100, `moderate` 101–200, `poor` 201–300, `very_poor` 301–400, `severe` 401–500) across 8 pollutants (`pm10`, `pm25`, `no2`, `o3`, `co`, `so2`, `nh3`, `pb`).
  - Supports pre-averaged `24h`/`8h` CPCB `avg_value` readings as well as hourly windows (`>= 16` of 24h, `>= 6` of 8h).
  - Enforces CPCB qualification: requires `>= 3` valid pollutants AND at least one of `pm25` or `pm10`; otherwise returns `aqi: null` with `unavailableReason`.
  - Rejects non-`cpcb` readings and rejects `co` in `µg/m³` (must be normalized to `mg/m³`).
- **Commute Emissions (`emissions.ts`)**: Computes weekly & yearly `kg CO2e` (`distanceKm * kgPerKm * tripsPerWeek`, `walking`/`cycling` = 0) and `avoidedPerWeek` / `avoidedPerYear` against the best alternative.
- **Exposure Indicator (`exposure.ts`)**: Computes planning indicator in `µg/m³·h` (`conc * minutes / 60`) when route concentrations are available.
- **Freshness (`freshness.ts`)**: Classifies readings as `fresh` (`<= 90 min`), `aging` (`<= 180 min`), or `stale` (`> 180 min`).
- **Indoor Rules (`indoor.ts`, `indoor-rules-1.0`)**: Generates ventilation, source-control (cooking fuel, incense, indoor smoking), wet-mopping, and HEPA CADR (`roomSizeM2 * 2.7 * 5`) recommendations.
- **Adaptive Planner (`planner.ts`)**: Shifts flexible activities within `±3` hours (`06:00–23:00 IST`) to minimize worst hourly AQI category; swaps to indoor alternatives when best window is `poor` or worse (`rank >= 4`).

---

## 5. AI & Safety Guardrails (`backend/src/server/ai/`)

- **Model & Validation (`gemini.ts`)**: Uses `gemini-2.5-flash` with JSON mode (`temperature: 0.3`, `maxOutputTokens: 600`). Validates every response against Zod schemas and runs `findInventedNumber()` to reject any hallucinated AQI/pollutant/weather numbers not present in `CONTEXT` (retries once, then falls back to deterministic copy with `aiUnavailable: true`).
- **Budgets & Caching**: Enforces daily caps (`10/day` per user, `200/day` app-wide via Redis), skips retries on `429 RESOURCE_EXHAUSTED`, caches chat replies for 30 minutes (`chat:cache:<hash>`), and logs token usage to `gemini_usage`.
- **Context Privacy (`context.ts`)**: Strips family member names (passes only `ageGroup` + `lifestyle`), supports user-excluded context keys, and appends explicit data limitation notices.
- **Deterministic Safety Classifier (`safety.ts`)**: Regex-based 0-token classifier detecting `"emergency"` (returns fixed `112` / hospital message without calling Gemini) and `"health_symptom"` (attaches non-diagnostic guidance banner).

---

## 6. Data Providers & Cron Ingestion (`backend/src/server/providers/`, `cron/jobs.ts`)

- **CPCB (`cpcb.ts`)**: `https://api.data.gov.in/resource/{CPCB_RESOURCE_ID}` using `DATA_GOV_API_KEY`.
- **OpenAQ (`openaq.ts`)**: `https://api.openaq.org/v3/locations` using `OPENAQ_API_KEY` (supplementary status only; never mixed into CPCB AQI).
- **Open-Meteo (`openmeteo.ts`)**: `air-quality-api.open-meteo.com/v1/air-quality` and `api.open-meteo.com/v1/forecast` (48h forecasts + current weather).
- **Normaliser (`normalise.ts`)**: Parses ISO and zoneless IST timestamps (`DD-MM-YYYY HH:mm:ss` / `YYYY-MM-DD HH:mm:ss`), converts `CO` from `µg/m³` to `mg/m³` (`/ 1000`), enforces physical ceilings, and computes `rawHash`.

---

## 7. Frontend Pages & UI (`frontend/src/app/`, `frontend/src/components/`)

### Public & Onboarding
- **`/` (`(marketing)/page.tsx`)**: 640vh scroll-story hero (moss island fly-in video frame cache, `FogBank`, `Mist`, `FloatingRock`, interactive pollutant `Hotspot`s, sample AQI card) + `TiltCard` feature highlights, `WhyAeriq`, `InsideTheApp` Apple-style carousel, `HowItWorks` (7-step grid), and `ClosingCta`.
- **`/login` & `/register`**: `AuthSplitShell` forms with Zod validation and password strength meter.
- **`/onboarding`**: 4-step setup wizard (Locations + geolocation `roundTo500m`, Lifestyle, Transport & Routine, Family members).

### Authenticated App (`(dashboard)/layout.tsx` with `TopBar`, `Rail`, `MobileTabBar`)
- **`/dashboard`**: Live AQI `CountUp` + `AqiBadge` + `SourceStamp`, weather card, interactive pollutant `Hotspot`s, Gemini "What to do today" accordion, upcoming planner activities, pollutant `Sparkline` cards, `24h`/`7d`/`30d` `AqiAreaChart` (Recharts), CO2e savings summary, and embedded `LeafletMap`.
- **`/assistant`**: Streaming SSE Gemini chat, conversation sidebar, removable context chips (`excludeContext`), safety banners, copy button, and `WordReveal` animation.
- **`/planner`**: 9-segment hourly air-window strip (observation vs forecast), condition-change regeneration banner, 3D-flipping activity cards (outdoor vs indoor alternative), completion ring, and custom activity form.
- **`/family`**: 3-column `TiltCard` grid of household members with slide-over add drawer and delete action.
- **`/indoor-air`**: Window ventilation status card, 6 home-profile toggles (`cookingFuel`, `incense`, `indoorSmoking`, `pets`, `constructionNearby`, `hasPurifier` + `roomSizeM2`), HEPA CADR calculator card, and actionable recommendations checklist.
- **`/simulator`**: Commute CO2e simulator with distance/trip sliders, 7 transport modes, Recharts `BarChart`, formula & assumptions table, and scenario saving.
- **`/community`**: Full-viewport `LeafletMap` with CPCB stations + community pins, category filter panel, and observation reporting modal (280-char limit).
- **`/settings`**: Profile summary, saved locations management, notification toggles, JSON data export, and account deletion (`DELETE` confirmation).
- **`/dev/gemini-usage` & `/dev/kit`**: Admin Gemini token/cache metrics dashboard and UI component showcase.

---

## 8. Testing & CI/CD

- **Backend Test Suite (`backend/tests/`, 5 files / 23 tests)**:
  - `aqi.test.ts` (8 tests): Sub-index math, breakpoints across all 8 pollutants, 500 cap, 16h/24h window qualification, CO unit guard, provider guard.
  - `engines.test.ts` (5 tests): Adaptive planner shifting & indoor swaps, commute emissions, purifier CADR, exposure indicator.
  - `ai.test.ts` (5 tests): Invented-number rejection & fallback, safety regex classifier, 429 no-retry, 30-min chat cache, freshness thresholds.
  - `contracts.test.ts` (3 tests): Zod contract validation, `roundPointTo500m`, PII stripping in community descriptions.
  - `normalise.test.ts` (2 tests): Unit conversions (`CO` µg/m³ -> mg/m³), IST-to-UTC timestamp parsing, physical ceiling & future-timestamp rejection.
- **GitHub Actions**:
  - `.github/workflows/ci.yml`: Runs `next typegen`, `tsc --noEmit`, `npm run lint`, and `npm run build` on `frontend/`; runs `npm run build` and `npm test` (Vitest) on `backend/`.
  - `.github/workflows/cd.yml`: Deploys `frontend/` to Vercel (when secrets are set) and triggers Render deploy hook for `backend/`.

---

## 9. Known Partial / UI-Only Items Observed
- **Assistant feedback buttons (`/assistant`)**: Thumbs up/down buttons toggle local UI state only (no backend persistence endpoint).
- **Exposure Simulator tab (`/simulator`)**: Renders an availability `EmptyState` placeholder when route-level concentration data is absent.
- **Settings Units & Language (`/settings`)**: Displays static `metric` / `en` chips rather than editable controls.
- **Forgot password link (`/login`)**: Links back to `/login` (no password-reset email flow implemented).
