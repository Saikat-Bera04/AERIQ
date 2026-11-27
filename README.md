# AERIQ — Intelligence for Every Breath

AERIQ is an AI-powered urban air-quality assistant for Indian cities. It turns timestamped AQI, pollutant, and weather observations into personal daily guidance for commutes, study, exercise, and indoor air routines.

> **Core rule:** Deterministic TypeScript engines compute every number (CPCB AQI, sub-indices, freshness, planner scoring, purifier CADR, and emissions). Google Gemini only explains validated context and never creates or estimates readings.

---

## Repository Structure

```text
AERIQ/
├── frontend/                   # Next.js App Router + React + TypeScript + Tailwind CSS
│   ├── src/app/(marketing)/    # 640vh pinned scroll-story landing page (/)
│   ├── src/app/(auth)/         # /login, /register
│   ├── src/app/onboarding/     # 4-step video-scrubbed onboarding
│   ├── src/app/(dashboard)/    # /dashboard, /assistant, /planner, /family, /indoor-air, /simulator, /community, /settings
│   ├── src/app/dev/            # /dev/kit, /dev/gemini-usage (admin)
│   └── src/lib/api.ts          # Typed API envelope client
├── backend/                    # Standalone Node + TypeScript API server (/api/v1/*, /api/cron/*)
│   ├── src/contracts/          # Shared Zod schemas & inferred types
│   ├── src/db/                 # PostgreSQL 16 + PostGIS Drizzle schema & reference seed
│   ├── src/server/providers/   # CPCB (data.gov.in), OpenAQ v3, Open-Meteo + normaliser
│   ├── src/server/engines/     # Pure engines: aqi, freshness, planner, indoor, emissions, exposure
│   ├── src/server/ai/          # Context builder, prompts, Gemini guard + budget, rule-based safety
│   └── tests/                  # Vitest unit & contract suites
└── .github/workflows/          # Frontend CI & Vercel CD workflows
```

---

## Technical Workflow

### 1. Data Ingestion & Normalisation (`/api/cron/*`)
- **Stations Sync (`/api/cron/stations-sync`)**: Fetches active CPCB stations from `data.gov.in` (`CPCB_RESOURCE_ID`) and upserts coordinates into PostgreSQL + PostGIS (`stations`).
- **Observations Ingestion (`/api/cron/ingest-observations`)**:
  1. Fetches CPCB station `avg_value` and OpenAQ v3 observations.
  2. `normaliseSamples()` maps pollutant names, converts units (`CO` µg/m³ → mg/m³), parses zoneless `DD-MM-YYYY HH:mm:ss` timestamps as `Asia/Kolkata` (IST) → UTC, rejects future (`> 10 min`), negative, or physically impossible values, and validates against `ReadingSchema`.
  3. Batch-inserts deduplicated readings (`rawHash`) and invokes `computeCpcbAqi()` to write `aqi_snapshots`.
- **Forecast & Weather (`/api/cron/ingest-forecast`)**: Fetches Open-Meteo air quality and weather for distinct rounded user locations.
- **Outage Degradation**: Routes read from PostgreSQL, never directly from providers. If a provider fails 3+ consecutive times, responses return the last stored reading with a `provider_outage` notice in `meta.notices`.

### 2. Deterministic Engines (`backend/src/server/engines/`)
- **CPCB NAQI (`aqi.ts`)**: Computes 24h (`>= 16` hourly readings) and 8h (`>= 6` hourly readings for `CO`, `O₃`) sub-indices, requires `>= 3` pollutants including `PM2.5` or `PM10`, caps at `500`, and returns `aqi: null` with a plain-language `unavailableReason` whenever rules aren't met. Only CPCB-sourced readings feed this engine.
- **Freshness (`freshness.ts`)**: `fresh` (`<= 90 min`), `aging` (`<= 180 min`), `stale` (`> 180 min`).
- **Adaptive Planner (`planner.ts`)**: Scores outdoor-flexible activities within `±3h` of preferred time (`worstCategoryRank × 10 + hoursMoved`) and attaches indoor alternatives when air is Poor or worse.
- **Indoor Air (`indoor.ts`)**: Evaluates rule-based ventilation windows and computes HEPA purifier guidance (`requiredCadrM3h = roomSizeM2 × 2.7 × 5`).
- **Impact Simulator (`emissions.ts`, `exposure.ts`)**: Separates tailpipe emissions (`E_week = distance × factor × trips`) from route exposure indicators (`µg/m³·h`).

### 3. Gemini Free-Tier Guardrails (`backend/src/server/ai/`)
- **Zero calls on page load**: `/dashboard` and `/planner` read cached recommendations from PostgreSQL or deterministic fallbacks; Gemini runs only on `Refresh` (`3/day` limit) or `Chat`.
- **Rule-based safety (`safety.ts`)**: Detects `health_symptom` and `emergency` phrases deterministically (0 Gemini calls).
- **Budgets & Caching**: Enforces `10` calls/user/day and `GEMINI_DAILY_CAP` (`200`/app/day) in Upstash Redis, caches identical chat questions for `30 min`, caps output at `600` tokens, retries once on schema/invented-number failure, and never retries on `429` quota errors. Every call is logged to `gemini_usage`.

### 4. Live Location Tracking & Privacy
- Coordinates from browser geolocation (`TopBar` **Live auto-sync** or `Onboarding`) are snapped to a `0.005°` (~500 m) grid (`roundPointTo500m`) before leaving the client or saving to `locations` / `community_reports`.
- `POST /api/v1/locations/sync` updates the user's rounded location, matches the nearest active CPCB station, and refreshes the dashboard, top bar, and planner in real time.

---

## Local Setup

1. **Environment files** (both gitignored):
   - Copy `backend/.env.example` → `backend/.env` and fill in Neon `DATABASE_URL`, `AUTH_SECRET`, `DATA_GOV_API_KEY`, `CPCB_RESOURCE_ID`, `OPENAQ_API_KEY`, `GEMINI_API_KEY`, `UPSTASH_REDIS_REST_*`, and `CRON_SECRET`.
   - Copy `frontend/.env.example` → `frontend/.env.local` and set `NEXT_PUBLIC_API_URL=http://localhost:4000`, `NEXT_PUBLIC_USE_MOCKS=false`, and matching `AUTH_SECRET`.

2. **Database migration & reference seed**:
   ```bash
   cd backend
   npm install
   npx drizzle-kit push --force
   npm run db:seed
   ```

3. **Run backend & frontend**:
   ```bash
   # Terminal 1 (Backend on :4000)
   cd backend && npm run dev

   # Terminal 2 (Frontend on :3000)
   cd frontend && npm run dev
   ```

---

## Test User Flow (End-to-End)

1. **Landing Story (`/`)**: Scroll through the 640vh floating island fly-in, illustrative `Sample` hotspots, station AQI card, Wobble cards, Apple Cards carousel, and click **SIGN IN** or **Create your profile**.
2. **Register & Onboarding (`/register` → `/onboarding`)**:
   - Create an account (`POST /api/v1/auth/register`). Unauthenticated visits to `/dashboard` redirect to `/login` (`401`).
   - Complete the 4-step video-scrubbed onboarding: pick a city or click **Use my approximate location** (rounded ~500 m), select lifestyle, transport/activities, and optionally add a family member.
3. **Dashboard & Live Location Sync (`/dashboard`)**:
   - View real CPCB station readings with `SourceStamp` (provider, station, IST time, freshness dot) or `"AQI unavailable"` with reason if `< 16h` of data exists.
   - Open the TopBar location pill, toggle **Live auto-sync** or type a city (e.g., `Delhi` or `28.59, 77.22`), and watch the dashboard sync to the nearest station.
   - Click **Refresh** on the AI card to trigger 1 Gemini recommendation call; reload the page to confirm `0` new Gemini calls (served from DB cache).
4. **Gemini Assistant (`/assistant`)**:
   - Ask `"Is it OK to run this evening?"` → streams SSE events (`context`, `safety`, `delta`, `structured`, `done`) with `dataLimitations`.
   - Ask `"I have a cough today"` → triggers the `health_symptom` ink safety banner.
   - Ask the same question again → served from the 30-min Redis cache (`cacheHit: true`, `0` Gemini calls).
5. **Planner (`/planner`)**: View hourly observation/forecast strip, toggle activity completion, flip an outdoor activity to its indoor alternative, or add a custom activity.
6. **Family & Indoor Air (`/family`, `/indoor-air`)**: Add/remove household members; toggle indoor sources (`gasOrWoodCooking`, `hasPurifier`, `roomSizeM2`) to see live ventilation state and HEPA CADR guidance.
7. **Simulator (`/simulator`)**: Compare `Private car` → `Metro` / `Walking` (`10 km`, `10 trips/week`), inspect the formula and assumptions table, save the scenario (updates Dashboard **Impact so far**), and check the **Exposure indicator** tab.
8. **Community Map (`/community`)**: Submit a smoke/dust observation (`POST /api/v1/community/reports`) → appears as `Pending review` at a 500 m rounded coordinate; filter by category.
9. **Settings (`/settings`)**: Toggle notification preferences, export all account data as JSON (`GET /api/v1/account/export`), or permanently delete the account (`DELETE /api/v1/account` with `DELETE` confirmation).

---

## Verification Commands

```bash
# Backend typecheck + 23 Vitest unit & contract tests
cd backend && npm run typecheck && npm test

# Frontend typecheck + ESLint + production build
cd frontend && npx tsc --noEmit && npm run lint && npm run build
```

See [TESTING.md](file:///Applications/Development/AERIQ/TESTING.md) and [TEST_REPORT.md](file:///Applications/Development/AERIQ/TEST_REPORT.md) for detailed phase logs and verification results.
