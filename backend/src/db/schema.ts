import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  varchar,
  uniqueIndex,
  index,
  customType,
  primaryKey,
} from "drizzle-orm/pg-core";

// PostGIS geography(Point, 4326) custom type
export const geographyPoint = customType<{
  data: { lat: number; lng: number };
  driverData: string;
}>({
  dataType() {
    return "geography(Point, 4326)";
  },
  toDriver(value) {
    return `SRID=4326;POINT(${value.lng} ${value.lat})`;
  },
  fromDriver(value) {
    // Parse WKT or hex if returned as text
    const match = /POINT\(([-\d.]+)\s+([-\d.]+)\)/.exec(String(value));
    if (match) {
      return { lng: Number(match[1]), lat: Number(match[2]) };
    }
    return { lat: 0, lng: 0 };
  },
});

export const lifestyleEnum = pgEnum("lifestyle_enum", [
  "student",
  "professional",
  "homemaker",
  "retired",
  "other",
]);

export const ageGroupEnum = pgEnum("age_group_enum", [
  "child",
  "teen",
  "adult",
  "older_adult",
]);

export const cookingFuelEnum = pgEnum("cooking_fuel_enum", [
  "lpg",
  "wood",
  "electric",
  "other",
]);

export const providerEnum = pgEnum("provider_enum", [
  "cpcb",
  "openaq",
  "openmeteo",
]);

export const pollutantEnum = pgEnum("pollutant_enum", [
  "pm25",
  "pm10",
  "no2",
  "o3",
  "so2",
  "co",
  "nh3",
  "pb",
]);

export const averagingEnum = pgEnum("averaging_enum", [
  "hourly",
  "8h",
  "24h",
  "instant",
]);

export const readingKindEnum = pgEnum("reading_kind_enum", [
  "observation",
  "forecast",
]);

export const safetyFlagEnum = pgEnum("safety_flag_enum", [
  "none",
  "health_symptom",
  "emergency",
]);

export const recommendationKindEnum = pgEnum("recommendation_kind_enum", [
  "daily",
  "refresh",
]);

export const planStatusEnum = pgEnum("plan_status_enum", ["current", "stale"]);
export const settingEnum = pgEnum("setting_enum", ["outdoor", "indoor"]);

export const transportModeEnum = pgEnum("transport_mode_enum", [
  "car",
  "two_wheeler",
  "auto",
  "bus",
  "metro",
  "cycling",
  "walking",
]);

export const reportCategoryEnum = pgEnum("report_category_enum", [
  "smoke",
  "dust",
  "burning_waste",
  "vehicle_exhaust",
  "industrial",
  "other",
]);

export const reportStatusEnum = pgEnum("report_status_enum", [
  "pending",
  "verified",
  "not_verified",
  "removed",
]);

// --- Accounts & Profile ---

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
  avatarColour: text("avatar_colour").notNull().default("#10291a"),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Auth.js Drizzle adapter default tables
export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  lifestyle: lifestyleEnum("lifestyle").notNull().default("professional"),
  transportModes: text("transport_modes").array().notNull().default([]),
  activities: jsonb("activities").notNull().default([]),
  units: text("units").notNull().default("metric"),
  language: text("language").notNull().default("en"),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const stations = pgTable(
  "stations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: providerEnum("provider").notNull(),
    providerStationId: text("provider_station_id").notNull(),
    name: text("name").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    point: geographyPoint("point").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("stations_provider_station_idx").on(
      t.provider,
      t.providerStationId
    ),
  ]
);

export const locations = pgTable("locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  city: text("city").notNull(),
  point: geographyPoint("point"),
  roundedPoint: geographyPoint("rounded_point").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  nearestStationId: uuid("nearest_station_id").references(() => stations.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const familyMembers = pgTable("family_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ageGroup: ageGroupEnum("age_group").notNull(),
  lifestyle: lifestyleEnum("lifestyle").notNull(),
  activities: jsonb("activities").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notificationPrefs = pgTable("notification_prefs", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  dailySummary: boolean("daily_summary").notNull().default(true),
  categoryChangeAlerts: boolean("category_change_alerts").notNull().default(true),
  planChangedAlerts: boolean("plan_changed_alerts").notNull().default(true),
  quietStart: text("quiet_start").notNull().default("22:00"),
  quietEnd: text("quiet_end").notNull().default("07:00"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const indoorProfiles = pgTable("indoor_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  cookingFuel: cookingFuelEnum("cooking_fuel").notNull().default("lpg"),
  incense: boolean("incense").notNull().default(false),
  indoorSmoking: boolean("indoor_smoking").notNull().default(false),
  pets: boolean("pets").notNull().default(false),
  constructionNearby: boolean("construction_nearby").notNull().default(false),
  hasPurifier: boolean("has_purifier").notNull().default(false),
  roomSizeM2: integer("room_size_m2"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// --- Air Data ---

export const readings = pgTable(
  "readings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stationId: uuid("station_id")
      .notNull()
      .references(() => stations.id, { onDelete: "cascade" }),
    pollutant: pollutantEnum("pollutant").notNull(),
    value: numeric("value", { precision: 10, scale: 3 }).notNull(),
    unit: text("unit").notNull(),
    averaging: averagingEnum("averaging").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    kind: readingKindEnum("kind").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
    rawHash: text("raw_hash").notNull(),
  },
  (t) => [
    uniqueIndex("readings_unique_idx").on(
      t.stationId,
      t.pollutant,
      t.observedAt,
      t.kind
    ),
    index("readings_station_observed_idx").on(t.stationId, t.observedAt),
  ]
);

export const weatherReadings = pgTable("weather_readings", {
  id: uuid("id").defaultRandom().primaryKey(),
  locationKey: text("location_key").notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  kind: readingKindEnum("kind").notNull(),
  tempC: numeric("temp_c", { precision: 5, scale: 2 }).notNull(),
  rhPct: numeric("rh_pct", { precision: 5, scale: 2 }).notNull(),
  windKph: numeric("wind_kph", { precision: 6, scale: 2 }).notNull(),
  windDirDeg: integer("wind_dir_deg").notNull(),
  precipMm: numeric("precip_mm", { precision: 6, scale: 2 }).notNull(),
  provider: text("provider").notNull().default("openmeteo"),
});

export const aqiSnapshots = pgTable("aqi_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  stationId: uuid("station_id")
    .notNull()
    .references(() => stations.id, { onDelete: "cascade" }),
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
  windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
  aqi: integer("aqi"),
  category: text("category"),
  dominantPollutant: text("dominant_pollutant"),
  subIndices: jsonb("sub_indices").notNull(),
  unavailableReason: text("unavailable_reason"),
  engineVersion: text("engine_version").notNull(),
});

export const providerStatus = pgTable("provider_status", {
  provider: providerEnum("provider").primaryKey(),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
  lastErrorCode: text("last_error_code"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
});

// --- Features ---

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  structured: jsonb("structured"),
  contextSnapshot: jsonb("context_snapshot"),
  safetyFlag: safetyFlagEnum("safety_flag").notNull().default("none"),
  model: text("model"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const recommendations = pgTable("recommendations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  kind: recommendationKindEnum("kind").notNull(),
  payload: jsonb("payload").notNull(),
  contextSnapshot: jsonb("context_snapshot").notNull(),
  dataAsOf: timestamp("data_as_of", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const plans = pgTable("plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  builtAt: timestamp("built_at", { withTimezone: true }).defaultNow().notNull(),
  dataAsOf: timestamp("data_as_of", { withTimezone: true }).notNull(),
  inputsHash: text("inputs_hash").notNull(),
  status: planStatusEnum("status").notNull().default("current"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const planActivities = pgTable("plan_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id")
    .notNull()
    .references(() => plans.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  start: timestamp("start", { withTimezone: true }).notNull(),
  end: timestamp("end", { withTimezone: true }).notNull(),
  setting: settingEnum("setting").notNull(),
  expectedAqi: integer("expected_aqi"),
  expectedCategory: text("expected_category"),
  reason: text("reason").notNull(),
  indoorAlternative: jsonb("indoor_alternative"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  userAdded: boolean("user_added").notNull().default(false),
});

export const emissionFactors = pgTable("emission_factors", {
  id: uuid("id").defaultRandom().primaryKey(),
  mode: transportModeEnum("mode").notNull(),
  kgCo2ePerPkm: numeric("kg_co2e_per_pkm", { precision: 8, scale: 4 }).notNull(),
  source: text("source").notNull(),
  publication: text("publication").notNull(),
  version: text("version").notNull(),
  geography: text("geography").notNull(),
  occupancyAssumption: text("occupancy_assumption").notNull(),
  validFrom: timestamp("valid_from", { withTimezone: true }).defaultNow().notNull(),
});

export const simulatorScenarios = pgTable("simulator_scenarios", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  inputs: jsonb("inputs").notNull(),
  result: jsonb("result").notNull(),
  factorVersion: text("factor_version").notNull(),
  savedAt: timestamp("saved_at", { withTimezone: true }).defaultNow().notNull(),
});

export const communityReports = pgTable("community_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  category: reportCategoryEnum("category").notNull(),
  description: varchar("description", { length: 280 }).notNull(),
  roundedPoint: geographyPoint("rounded_point").notNull(),
  status: reportStatusEnum("status").notNull().default("pending"),
  flagCount: integer("flag_count").notNull().default(0),
  moderatedBy: uuid("moderated_by").references(() => users.id, {
    onDelete: "set null",
  }),
  moderatedAt: timestamp("moderated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  meta: jsonb("meta").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
