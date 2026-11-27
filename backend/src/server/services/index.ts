import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  MOCK_AQI_RESULT,
  MOCK_DAILY_RECOMMENDATION,
  MOCK_EMISSION_FACTORS,
  MOCK_READINGS,
  MOCK_STATION,
  MOCK_WEATHER,
} from "@/mocks/fixtures";
import { computeCommuteEmissions } from "@/server/engines/emissions";
import { computeExposureIndicator } from "@/server/engines/exposure";
import { evaluateIndoorRules } from "@/server/engines/indoor";
import { buildPlan, type HourlyWindow } from "@/server/engines/planner";
import { buildContext } from "@/server/ai/context";
import { generateChatReply, generateDailyRecommendation } from "@/server/ai/gemini";
import { classifySafety, EMERGENCY_FIXED_REPLY } from "@/server/ai/safety";
import { AppError } from "@/server/lib/envelope";
import { checkRateLimit } from "@/server/lib/redis";
import {
  hashPassword,
  roundPointTo500m,
  sanitiseReportDescription,
  verifyPassword,
} from "@/server/lib/privacy";
import type {
  CommuteSimRequest,
  IndoorProfile,
  RegisterRequest,
  SyncLocationRequest,
} from "@/contracts";

export function isMocksEnabled(): boolean {
  return process.env.USE_MOCKS !== "false";
}

export async function registerUser(input: RegisterRequest) {
  const passwordHash = await hashPassword(input.password);
  if (isMocksEnabled()) {
    return { userId: crypto.randomUUID(), email: input.email };
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, input.email.toLowerCase()),
  });
  if (existing) {
    throw new AppError("VALIDATION_FAILED", 422, "Email already registered", {
      fields: { email: "An account with this email already exists" },
    });
  }

  const [created] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
    })
    .returning({ id: users.id, email: users.email });

  return { userId: created.id, email: created.email };
}

export async function loginUser(email: string, password: string) {
  const lockKey = `login_fail:${email.toLowerCase()}`;
  const rl = await checkRateLimit(`login_check:${email.toLowerCase()}`, 5, 900);
  if (!rl.allowed) {
    throw new AppError(
      "RATE_LIMITED",
      429,
      "Too many failed login attempts. Try again in 15 minutes.",
      { retryAfterSec: rl.retryAfterSec }
    );
  }

  if (isMocksEnabled()) {
    if (password.length < 6) {
      await checkRateLimit(lockKey, 5, 900);
      throw new AppError("UNAUTHENTICATED", 401, "Invalid email or password");
    }
    return {
      userId: "mock-user-1",
      email: email.toLowerCase(),
      name: "Aarav Sen",
      role: "user",
    };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new AppError("UNAUTHENTICATED", 401, "Invalid email or password");
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function getAqiCurrent() {
  return {
    aqi: MOCK_AQI_RESULT,
    pollutants: MOCK_READINGS,
    weather: MOCK_WEATHER,
    station: MOCK_STATION,
  };
}

const KNOWN_CITIES = [
  { city: "Kolkata", station: "Rabindra Bharati", lat: 22.5726, lng: 88.3639, aqi: 212, category: "poor" as const },
  { city: "New Delhi", station: "Lodhi Road", lat: 28.5918, lng: 77.2273, aqi: 286, category: "poor" as const },
  { city: "Bengaluru", station: "BTM Layout", lat: 12.9166, lng: 77.6101, aqi: 74, category: "satisfactory" as const },
  { city: "Mumbai", station: "Bandra Kurla Complex", lat: 19.0653, lng: 72.8681, aqi: 138, category: "moderate" as const },
  { city: "Chennai", station: "Alandur", lat: 13.0025, lng: 80.2061, aqi: 86, category: "satisfactory" as const },
  { city: "Hyderabad", station: "Jubilee Hills", lat: 17.4319, lng: 78.4071, aqi: 118, category: "moderate" as const },
];

export async function syncLiveLocation(
  _userId: string,
  input: SyncLocationRequest
) {
  const roundedPoint = roundPointTo500m(input.lat, input.lng);

  // Pick nearest known CPCB station by squared degree distance
  let nearest = KNOWN_CITIES[0];
  let bestDist = Infinity;
  for (const c of KNOWN_CITIES) {
    const d = (c.lat - roundedPoint.lat) ** 2 + (c.lng - roundedPoint.lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      nearest = c;
    }
  }

  const syncedAt = new Date().toISOString();
  return {
    location: {
      id: `live-${roundedPoint.lat}-${roundedPoint.lng}`,
      label: input.label ?? "Live location",
      city: input.city ?? nearest.city,
      roundedPoint,
      autoSync: input.autoSync,
      syncedAt,
    },
    station: {
      id: `st-cpcb-${nearest.city.toLowerCase().replace(/\s+/g, "-")}`,
      name: nearest.station,
      city: nearest.city,
      provider: "cpcb",
    },
    aqi: {
      ...MOCK_AQI_RESULT,
      aqi: nearest.aqi,
      category: nearest.category,
      stationName: nearest.station,
    },
    pollutants: MOCK_READINGS.map((r) => ({
      ...r,
      stationName: nearest.station,
    })),
    weather: MOCK_WEATHER,
  };
}

export async function getAssistantRecommendation(
  excludeContext: string[] = []
) {
  const ctx = buildContext(
    {
      location: {
        city: "Kolkata",
        areaLabel: "Rabindra Bharati",
        stationName: MOCK_STATION.name,
        distanceKm: 2.1,
      },
      aqi: MOCK_AQI_RESULT,
      readings: MOCK_READINGS,
      forecast: [
        { hourLabel: "12:00 IST", category: "moderate", kind: "forecast" },
        { hourLabel: "15:00 IST", category: "moderate", kind: "forecast" },
      ],
      weather: MOCK_WEATHER,
      profile: {
        firstName: "Aarav",
        lifestyle: "professional",
        transportModes: ["metro", "walking"],
        activities: [{ name: "Evening run", preferredTime: "18:30" }],
      },
      family: [{ ageGroup: "older_adult", lifestyle: "retired" }],
    },
    excludeContext
  );

  if (isMocksEnabled() && !process.env.GEMINI_API_KEY) {
    return {
      recommendation: MOCK_DAILY_RECOMMENDATION,
      contextSnapshot: ctx,
      dataAsOf: MOCK_AQI_RESULT.windowEnd,
      aiUnavailable: false,
    };
  }

  const res = await generateDailyRecommendation(ctx);
  return {
    recommendation: res.data,
    contextSnapshot: ctx,
    dataAsOf: MOCK_AQI_RESULT.windowEnd,
    aiUnavailable: res.aiUnavailable,
  };
}

export async function runAssistantChat(
  message: string,
  excludeContext: string[] = []
) {
  const ctx = buildContext(
    {
      location: {
        city: "Kolkata",
        areaLabel: "Rabindra Bharati",
        stationName: MOCK_STATION.name,
        distanceKm: 2.1,
      },
      aqi: MOCK_AQI_RESULT,
      readings: MOCK_READINGS,
      forecast: [
        { hourLabel: "12:00 IST", category: "moderate", kind: "forecast" },
        { hourLabel: "15:00 IST", category: "moderate", kind: "forecast" },
      ],
      weather: MOCK_WEATHER,
      profile: {
        firstName: "Aarav",
        lifestyle: "professional",
        transportModes: ["metro", "walking"],
        activities: [{ name: "Evening run", preferredTime: "18:30" }],
      },
      family: [{ ageGroup: "older_adult", lifestyle: "retired" }],
    },
    excludeContext
  );

  const safetyFlag = await classifySafety(message);
  if (safetyFlag === "emergency") {
    return {
      contextSnapshot: ctx,
      safetyFlag,
      reply: {
        text: EMERGENCY_FIXED_REPLY,
        dataLimitations: ctx.limits,
      },
      aiUnavailable: false,
    };
  }

  const res = await generateChatReply(ctx, message);
  return {
    contextSnapshot: ctx,
    safetyFlag,
    reply: res.data,
    aiUnavailable: res.aiUnavailable,
  };
}

export function getTodayPlan() {
  const hourlyWindows: HourlyWindow[] = [
    { hour: 6, hourLabel: "6 AM", aqi: 228, category: "poor", provider: "cpcb", kind: "observation" } as HourlyWindow & { hourLabel: string },
    { hour: 8, hourLabel: "8 AM", aqi: 212, category: "poor", provider: "cpcb", kind: "observation" } as HourlyWindow & { hourLabel: string },
    { hour: 12, hourLabel: "12 PM", aqi: 174, category: "moderate", provider: "openmeteo", kind: "forecast" } as HourlyWindow & { hourLabel: string },
    { hour: 15, hourLabel: "3 PM", aqi: 152, category: "moderate", provider: "openmeteo", kind: "forecast" } as HourlyWindow & { hourLabel: string },
    { hour: 18, hourLabel: "6 PM", aqi: 192, category: "moderate", provider: "openmeteo", kind: "forecast" } as HourlyWindow & { hourLabel: string },
    { hour: 21, hourLabel: "9 PM", aqi: 224, category: "poor", provider: "openmeteo", kind: "forecast" } as HourlyWindow & { hourLabel: string },
  ];

  return buildPlan(
    [
      { id: "act-1", title: "Morning walk", preferredHour: 7, flexible: true, type: "walk" },
      { id: "act-2", title: "Office commute", preferredHour: 9, flexible: false, type: "commute" },
      { id: "act-3", title: "Evening run", preferredHour: 18, flexible: true, type: "exercise" },
    ],
    hourlyWindows,
    new Date().toISOString()
  );
}

export function getIndoorRecommendations(profile: IndoorProfile) {
  const hourlyWindows = [
    { hour: 8, hourLabel: "8 AM", aqi: 212, category: "poor" as const, provider: "cpcb", kind: "observation" as const },
    { hour: 15, hourLabel: "3 PM", aqi: 152, category: "moderate" as const, provider: "openmeteo", kind: "forecast" as const },
  ];
  return evaluateIndoorRules("poor", profile, hourlyWindows);
}

export function runCommuteSimulation(input: CommuteSimRequest) {
  return computeCommuteEmissions(input, MOCK_EMISSION_FACTORS);
}

export function runExposureSimulation(
  segments: { mode: CommuteSimRequest["baselineMode"]; minutes: number }[]
) {
  return computeExposureIndicator(segments, null);
}

export function createCommunityReport(input: {
  category: string;
  description: string;
  lat: number;
  lng: number;
}) {
  const sanitised = sanitiseReportDescription(input.description);
  if (!sanitised.ok) {
    throw new AppError("VALIDATION_FAILED", 422, sanitised.reason ?? "Invalid description", {
      fields: { description: sanitised.reason ?? "Invalid description" },
    });
  }
  const roundedPoint = roundPointTo500m(input.lat, input.lng);
  return {
    id: crypto.randomUUID(),
    category: input.category,
    description: sanitised.text,
    roundedPoint,
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  };
}
