import crypto from "node:crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  aqiSnapshots,
  auditLog,
  communityReports,
  conversations,
  emissionFactors,
  familyMembers,
  geminiUsage,
  indoorProfiles,
  locations,
  messages,
  notificationPrefs,
  planActivities,
  plans,
  profiles,
  providerStatus,
  readings,
  recommendations,
  reportFlags,
  sessions,
  simulatorScenarios,
  stations,
  users,
  verificationTokens,
  weatherReadings,
} from "@/db/schema";
import type {
  AqiCategorySlug,
  AqiResult,
  CommuteSimRequest,
  CreateLocationRequest,
  IndoorProfile,
  NotificationPrefs,
  PatchProfileRequest,
  Pollutant,
  Reading,
  RegisterRequest,
  SyncLocationRequest,
} from "@/contracts";
import { computeSubIndex } from "@/server/engines/aqi";
import { evaluateAdvisories } from "@/server/engines/advisory";
import { categoryFromAqi } from "@/server/engines/aqi-breakpoints";
import { computeCommuteEmissions } from "@/server/engines/emissions";
import { computeExposureIndicator } from "@/server/engines/exposure";
import { computeFreshness } from "@/server/engines/freshness";
import { evaluateIndoorRules } from "@/server/engines/indoor";
import { buildPlan, type HourlyWindow } from "@/server/engines/planner";
import { fetchLatest as fetchOpenMeteo } from "@/server/providers/openmeteo";
import { buildContext } from "@/server/ai/context";
import {
  buildDeterministicDailyFallback,
  generateChatReply,
  generateDailyRecommendation,
} from "@/server/ai/gemini";
import { classifySafety, EMERGENCY_FIXED_REPLY } from "@/server/ai/safety";
import { AppError } from "@/server/lib/envelope";
import {
  deleteAllUserSessions,
  hashPassword,
  hashToken,
  roundPointTo500m,
  sanitiseReportDescription,
  verifyPassword,
} from "@/server/lib/privacy";
import { cacheGet, cacheSet, checkRateLimit, redis } from "@/server/lib/redis";

export function isAdminEmail(email: string): boolean {
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

// --- Auth & Profile ---

export async function registerUser(input: RegisterRequest) {
  const email = input.email.toLowerCase();
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    throw new AppError("VALIDATION_FAILED", 422, "Email already registered", {
      fields: { email: "An account with this email already exists" },
    });
  }

  const passwordHash = await hashPassword(input.password);
  const role = isAdminEmail(email) ? "admin" : "user";

  const [created] = await db
    .insert(users)
    .values({
      name: input.name,
      email,
      passwordHash,
      role,
    })
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role });

  await db.insert(notificationPrefs).values({ userId: created.id }).onConflictDoNothing();
  await db.insert(indoorProfiles).values({ userId: created.id }).onConflictDoNothing();

  return { userId: created.id, email: created.email, name: created.name, role: created.role };
}

export async function loginUser(emailRaw: string, password: string) {
  const email = emailRaw.trim().toLowerCase();
  const lockKey = `auth:lock:${email}`;
  const failKey = `auth:fail:${email}`;

  if (await cacheGet<string>(lockKey)) {
    throw new AppError(
      "RATE_LIMITED",
      429,
      "Too many failed login attempts. Try again in 15 minutes.",
      { retryAfterSec: 900 }
    );
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    const rl = await checkRateLimit(failKey, 4, 900);
    if (!rl.allowed) {
      await cacheSet(lockKey, "1", 900);
    }
    throw new AppError("UNAUTHENTICATED", 401, "Invalid email or password");
  }

  if (redis) {
    await redis.del(failKey);
    await redis.del(lockKey);
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarColour: user.avatarColour,
  };
}

export async function requestPasswordReset(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (user) {
    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = hashToken(rawToken);
    const identifier = `reset:${email}`;
    const expires = new Date(Date.now() + 30 * 60 * 1000);

    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));
    await db.insert(verificationTokens).values({
      identifier,
      token: tokenHash,
      expires,
    });

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const appUrl = (process.env.APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
      const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "AERIQ <noreply@aeriq.app>",
          to: [email],
          subject: "Reset your AERIQ password",
          html: `<p>Click below to reset your password (valid for 30 minutes):</p><p><a href="${resetLink}">${resetLink}</a></p>`,
        }),
        signal: AbortSignal.timeout(8000),
      }).catch(() => {});
    }
  }

  return { sent: true };
}

export async function resetPasswordWithToken(rawToken: string, newPassword: string) {
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const row = await db.query.verificationTokens.findFirst({
    where: eq(verificationTokens.token, tokenHash),
  });

  if (!row || !row.identifier.startsWith("reset:") || row.expires <= now) {
    throw new AppError("VALIDATION_FAILED", 422, "Invalid or expired reset token");
  }

  const email = row.identifier.slice("reset:".length);
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (!user) {
    throw new AppError("VALIDATION_FAILED", 422, "Invalid or expired reset token");
  }

  const passwordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await db
    .delete(verificationTokens)
    .where(eq(verificationTokens.token, tokenHash));

  await deleteAllUserSessions(user.id);

  return { reset: true };
}

export async function getMe(userId: string) {
  const [user, profile, userLocs] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarColour: true,
        createdAt: true,
      },
    }),
    db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    }),
    db.query.locations.findMany({
      where: eq(locations.userId, userId),
      orderBy: [desc(locations.isDefault), desc(locations.createdAt)],
    }),
  ]);
  if (!user) throw new AppError("UNAUTHENTICATED", 401, "User not found");

  return {
    user,
    profile: profile ?? null,
    locations: userLocs.map((l) => ({
      id: l.id,
      label: l.label,
      city: l.city,
      roundedPoint: l.roundedPoint,
      isDefault: l.isDefault,
      nearestStationId: l.nearestStationId,
    })),
    onboarded: Boolean(profile?.onboardedAt),
  };
}

export async function upsertProfile(userId: string, input: PatchProfileRequest) {
  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });

  if (!existing) {
    const [created] = await db
      .insert(profiles)
      .values({
        userId,
        lifestyle: input.lifestyle ?? "professional",
        transportModes: input.transportModes ?? [],
        activities: input.activities ?? [],
        units: input.units ?? "metric",
        language: input.language ?? "en",
        onboardedAt: new Date(),
      })
      .returning();
    return created;
  }

  const [updated] = await db
    .update(profiles)
    .set({
      ...(input.lifestyle ? { lifestyle: input.lifestyle } : {}),
      ...(input.transportModes ? { transportModes: input.transportModes } : {}),
      ...(input.activities ? { activities: input.activities } : {}),
      onboardedAt: existing.onboardedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, userId))
    .returning();

  return updated;
}

// --- Locations & Nearest Station ---

async function findNearestStation(lat: number, lng: number, cityHint?: string) {
  const all = await db.query.stations.findMany({
    where: eq(stations.active, true),
  });
  if (all.length === 0) return null;

  const cityMatches = cityHint
    ? all.filter((s) => s.city.toLowerCase().includes(cityHint.toLowerCase()))
    : [];
  const pool = cityMatches.length > 0 ? cityMatches : all;

  let best = pool[0];
  let bestDist = Infinity;
  for (const st of pool) {
    const d = (st.point.lat - lat) ** 2 + (st.point.lng - lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = st;
    }
  }
  return best;
}

export async function listLocations(userId: string) {
  const rows = await db.query.locations.findMany({
    where: eq(locations.userId, userId),
    orderBy: [desc(locations.isDefault), desc(locations.createdAt)],
  });
  return rows.map((l) => ({
    id: l.id,
    label: l.label,
    city: l.city,
    roundedPoint: l.roundedPoint,
    isDefault: l.isDefault,
    nearestStationId: l.nearestStationId,
  }));
}

export async function createLocation(userId: string, input: CreateLocationRequest) {
  const rawLat = input.point?.lat ?? 22.5726;
  const rawLng = input.point?.lng ?? 88.3639;
  const rounded = roundPointTo500m(rawLat, rawLng);
  const nearest = await findNearestStation(rounded.lat, rounded.lng, input.city);

  if (input.isDefault) {
    await db
      .update(locations)
      .set({ isDefault: false })
      .where(eq(locations.userId, userId));
  }

  const [created] = await db
    .insert(locations)
    .values({
      userId,
      label: input.label,
      city: input.city,
      point: input.point ?? null,
      roundedPoint: rounded,
      isDefault: input.isDefault,
      nearestStationId: nearest?.id ?? null,
    })
    .returning();

  return {
    id: created.id,
    label: created.label,
    city: created.city,
    roundedPoint: created.roundedPoint,
    isDefault: created.isDefault,
    nearestStationId: created.nearestStationId,
  };
}

export async function patchLocation(
  userId: string,
  locId: string,
  patch: { label?: string; isDefault?: boolean }
) {
  const existing = await db.query.locations.findFirst({
    where: and(eq(locations.id, locId), eq(locations.userId, userId)),
  });
  if (!existing) throw new AppError("NOT_FOUND", 404, "Location not found");

  if (patch.isDefault) {
    await db
      .update(locations)
      .set({ isDefault: false })
      .where(eq(locations.userId, userId));
  }

  const [updated] = await db
    .update(locations)
    .set({
      ...(patch.label ? { label: patch.label } : {}),
      ...(patch.isDefault !== undefined ? { isDefault: patch.isDefault } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(locations.id, locId), eq(locations.userId, userId)))
    .returning();

  return {
    id: updated.id,
    label: updated.label,
    city: updated.city,
    roundedPoint: updated.roundedPoint,
    isDefault: updated.isDefault,
    nearestStationId: updated.nearestStationId,
  };
}

export async function deleteLocation(userId: string, locId: string) {
  const deleted = await db
    .delete(locations)
    .where(and(eq(locations.id, locId), eq(locations.userId, userId)))
    .returning({ id: locations.id });
  if (deleted.length === 0) throw new AppError("NOT_FOUND", 404, "Location not found");
  return { deleted: true };
}

export async function syncLiveLocation(userId: string, input: SyncLocationRequest) {
  const hasCoords = input.lat !== undefined && input.lng !== undefined;
  const nearest = await findNearestStation(
    input.lat ?? 22.5726,
    input.lng ?? 88.3639,
    input.city
  );
  const roundedPoint = hasCoords
    ? roundPointTo500m(input.lat!, input.lng!)
    : roundPointTo500m(nearest?.point.lat ?? 22.5726, nearest?.point.lng ?? 88.3639);

  const city = input.city ?? nearest?.city ?? "Unknown";
  const existingDefault = await db.query.locations.findFirst({
    where: and(eq(locations.userId, userId), eq(locations.isDefault, true)),
  });

  let locId = existingDefault?.id;
  if (existingDefault) {
    await db
      .update(locations)
      .set({
        city,
        roundedPoint,
        nearestStationId: nearest?.id ?? null,
        updatedAt: new Date(),
      })
      .where(eq(locations.id, existingDefault.id));
  } else {
    const [created] = await db
      .insert(locations)
      .values({
        userId,
        label: input.label ?? "Live location",
        city,
        roundedPoint,
        isDefault: true,
        nearestStationId: nearest?.id ?? null,
      })
      .returning();
    locId = created.id;
  }

  const current = await getAqiCurrent(userId, locId);
  return {
    location: {
      id: locId!,
      label: input.label ?? "Live location",
      city,
      roundedPoint,
      autoSync: input.autoSync,
      syncedAt: new Date().toISOString(),
    },
    ...current,
  };
}

// --- AQI, History, Forecast, Weather ---

async function resolveUserLocation(userId: string, locationId?: string) {
  if (locationId) {
    const loc = await db.query.locations.findFirst({
      where: and(eq(locations.id, locationId), eq(locations.userId, userId)),
    });
    if (loc) return loc;
  }
  return await db.query.locations.findFirst({
    where: eq(locations.userId, userId),
    orderBy: [desc(locations.isDefault), desc(locations.createdAt)],
  });
}

export async function getAqiCurrent(userId: string, locationId?: string) {
  const loc = await resolveUserLocation(userId, locationId);
  let station = loc?.nearestStationId
    ? await db.query.stations.findFirst({
        where: eq(stations.id, loc.nearestStationId),
      })
    : null;

  if (!station) {
    station = await findNearestStation(
      loc?.roundedPoint.lat ?? 22.5726,
      loc?.roundedPoint.lng ?? 88.3639,
      loc?.city
    );
  }

  if (!station) {
    throw new AppError("PROVIDER_UNAVAILABLE", 503, "No active stations synced yet");
  }

  const cacheKey = `aqi:current:${station.id}`;
  const cached = await cacheGet<{
    aqi: AqiResult;
    pollutants: Reading[];
    weather: {
      observedAt: string;
      kind: "observation" | "forecast";
      tempC: number;
      rhPct: number;
      windKph: number;
      windDirDeg: number;
      precipMm: number;
      provider: "openmeteo";
    } | null;
    station: { id: string; name: string; city: string; provider: string };
    notices: { code: "provider_outage"; provider: string; lastSuccessAt: string | null }[];
  }>(cacheKey);

  const computeUserAdvisories = async (cat: AqiCategorySlug | null, fresh: "fresh" | "aging" | "stale") => {
    const [prof, fam] = await Promise.all([
      db.query.profiles.findFirst({ where: eq(profiles.userId, userId) }),
      db.query.familyMembers.findMany({ where: eq(familyMembers.userId, userId) }),
    ]);
    return evaluateAdvisories({
      category: cat,
      freshness: fresh,
      lifestyle: prof?.lifestyle,
      ageGroups: fam.map((m) => m.ageGroup),
      activities: ((prof?.activities as { name: string }[]) ?? []).map((a) => a.name.toLowerCase()),
    });
  };

  if (cached) {
    const advisories = await computeUserAdvisories(
      cached.aqi.category,
      computeFreshness(cached.aqi.windowEnd)
    );
    return { ...cached, advisories };
  }

  const [snapshot, latestReadings, wx, cpcbStatus] = await Promise.all([
    db.query.aqiSnapshots.findFirst({
      where: eq(aqiSnapshots.stationId, station.id),
      orderBy: [desc(aqiSnapshots.computedAt)],
    }),
    db
      .select()
      .from(readings)
      .where(and(eq(readings.stationId, station.id), eq(readings.kind, "observation")))
      .orderBy(desc(readings.observedAt))
      .limit(24),
    db.query.weatherReadings.findFirst({
      orderBy: [desc(weatherReadings.observedAt)],
    }),
    db.query.providerStatus.findFirst({
      where: eq(providerStatus.provider, "cpcb"),
    }),
  ]);

  // Deduplicate to latest reading per pollutant
  const byPollutant = new Map<string, Reading>();
  for (const r of latestReadings) {
    if (!byPollutant.has(r.pollutant)) {
      const obsIso = r.observedAt.toISOString();
      byPollutant.set(r.pollutant, {
        pollutant: r.pollutant as Pollutant,
        value: Number(r.value),
        unit: r.unit as "µg/m³" | "mg/m³",
        averaging: r.averaging as Reading["averaging"],
        provider: station.provider as Reading["provider"],
        stationId: station.id,
        stationName: station.name,
        observedAt: obsIso,
        kind: "observation",
        freshness: computeFreshness(obsIso),
      });
    }
  }

  const notices =
    cpcbStatus && cpcbStatus.consecutiveFailures >= 3
      ? [
          {
            code: "provider_outage" as const,
            provider: "CPCB",
            lastSuccessAt: cpcbStatus.lastSuccessAt?.toISOString() ?? null,
          },
        ]
      : [];

  const aqiResult: AqiResult = snapshot
    ? {
        aqi: snapshot.aqi,
        category: (snapshot.category as AqiCategorySlug | null) ?? null,
        dominantPollutants: snapshot.dominantPollutant
          ? [snapshot.dominantPollutant as Pollutant]
          : [],
        subIndices: (snapshot.subIndices as AqiResult["subIndices"]) ?? [],
        unavailableReason: snapshot.unavailableReason,
        windowEnd: snapshot.windowEnd.toISOString(),
        computedAt: snapshot.computedAt.toISOString(),
        provider: "cpcb",
        stationId: station.id,
        stationName: station.name,
        engineVersion: snapshot.engineVersion,
      }
    : {
        aqi: null,
        category: null,
        dominantPollutants: [],
        subIndices: [],
        unavailableReason: "Waiting for 16 hourly CPCB observations at this station",
        windowEnd: new Date().toISOString(),
        computedAt: new Date().toISOString(),
        provider: "cpcb",
        stationId: station.id,
        stationName: station.name,
        engineVersion: "cpcb-naqi-2014.1",
      };

  const result = {
    aqi: aqiResult,
    pollutants: Array.from(byPollutant.values()),
    weather: wx
      ? {
          observedAt: wx.observedAt.toISOString(),
          kind: wx.kind,
          tempC: Number(wx.tempC),
          rhPct: Number(wx.rhPct),
          windKph: Number(wx.windKph),
          windDirDeg: wx.windDirDeg,
          precipMm: Number(wx.precipMm),
          provider: "openmeteo" as const,
        }
      : null,
    station: {
      id: station.id,
      name: station.name,
      city: station.city,
      provider: station.provider,
    },
    notices,
  };

  await cacheSet(cacheKey, result, 120);
  const advisories = await computeUserAdvisories(
    result.aqi.category,
    computeFreshness(result.aqi.windowEnd)
  );
  return { ...result, advisories };
}

export async function getAqiHistory(
  userId: string,
  locationId: string | undefined,
  range: "24h" | "7d" | "30d"
) {
  const current = await getAqiCurrent(userId, locationId);
  const hours = range === "24h" ? 24 : range === "7d" ? 168 : 720;
  const since = new Date(Date.now() - hours * 3600 * 1000);

  const snaps = await db
    .select()
    .from(aqiSnapshots)
    .where(
      and(
        eq(aqiSnapshots.stationId, current.station.id),
        gte(aqiSnapshots.windowEnd, since)
      )
    )
    .orderBy(aqiSnapshots.windowEnd);

  return {
    range,
    points: snaps.map((s) => ({
      t: s.windowEnd.toISOString(),
      aqi: s.aqi,
      category: (s.category as AqiCategorySlug | null) ?? null,
      kind: "observation" as const,
    })),
  };
}

export async function getAqiForecast(
  userId: string,
  locationId: string | undefined,
  hours = 48
) {
  const clampedHours = Math.max(1, Math.min(48, Math.round(hours)));
  const loc = await resolveUserLocation(userId, locationId);
  const pt = loc?.roundedPoint ?? { lat: 22.575, lng: 88.365 };
  const cacheKey = `aqi:forecast:${pt.lat},${pt.lng}:${clampedHours}`;

  const cached = await cacheGet<{
    hours: number;
    points: {
      t: string;
      value: number;
      category: AqiCategorySlug;
      provider: "Open-Meteo";
      kind: "forecast";
    }[];
  }>(cacheKey);
  if (cached) return cached;

  try {
    const { airQuality } = await fetchOpenMeteo(pt);
    const aq = airQuality.raw as {
      hourly?: { time?: string[]; pm2_5?: (number | null)[] };
    };
    const times = aq.hourly?.time ?? [];
    const pm25s = aq.hourly?.pm2_5 ?? [];
    const points: {
      t: string;
      value: number;
      category: AqiCategorySlug;
      provider: "Open-Meteo";
      kind: "forecast";
    }[] = [];

    for (let i = 0; i < Math.min(times.length, clampedHours); i++) {
      const val = pm25s[i];
      if (val === null || val === undefined || !Number.isFinite(val)) continue;
      const subAqi = computeSubIndex("pm25", Math.max(0, val));
      const iso = times[i].endsWith("Z") ? times[i] : `${times[i]}Z`;
      points.push({
        t: new Date(iso).toISOString(),
        value: subAqi,
        category: categoryFromAqi(subAqi),
        provider: "Open-Meteo",
        kind: "forecast",
      });
    }

    const result = { hours: clampedHours, points };
    await cacheSet(cacheKey, result, 900);
    return result;
  } catch {
    return { hours: clampedHours, points: [] };
  }
}

export async function getWeather(hours = 12) {
  const rows = await db
    .select()
    .from(weatherReadings)
    .orderBy(desc(weatherReadings.observedAt))
    .limit(hours);

  return {
    hours,
    points: rows.map((w) => ({
      observedAt: w.observedAt.toISOString(),
      kind: w.kind,
      tempC: Number(w.tempC),
      rhPct: Number(w.rhPct),
      windKph: Number(w.windKph),
      windDirDeg: w.windDirDeg,
      precipMm: Number(w.precipMm),
      provider: "openmeteo" as const,
    })),
  };
}

// --- Gemini Assistant & Cached Daily Recommendations ---

async function buildUserAiContext(
  userId: string,
  locationId?: string,
  excludeContext: string[] = []
) {
  const me = await getMe(userId);
  const current = await getAqiCurrent(userId, locationId);
  const fam = await db.query.familyMembers.findMany({
    where: eq(familyMembers.userId, userId),
  });
  const savedScens = await db
    .select()
    .from(simulatorScenarios)
    .where(eq(simulatorScenarios.userId, userId))
    .orderBy(desc(simulatorScenarios.savedAt))
    .limit(3);
  const loc = await resolveUserLocation(userId, locationId);

  return buildContext(
    {
      location: {
        city: loc?.city ?? current.station.city,
        areaLabel: loc?.label ?? current.station.name,
        stationName: current.station.name,
        distanceKm: 2.0,
      },
      aqi: current.aqi,
      readings: current.pollutants,
      forecast: [],
      weather: current.weather,
      profile: {
        firstName: me.user.name.split(" ")[0] || "there",
        lifestyle: me.profile?.lifestyle ?? "professional",
        transportModes: me.profile?.transportModes ?? [],
        activities: (me.profile?.activities as { name: string; preferredTime: string }[]) ?? [],
      },
      family: fam.map((m) => ({ ageGroup: m.ageGroup, lifestyle: m.lifestyle })),
      advisories: current.advisories,
      savedScenarios: savedScens.map((s) => {
        const inp = s.inputs as { baselineMode?: string };
        const res = s.result as { avoidedPerWeek?: number; avoidedPerYear?: number };
        return {
          baselineMode: inp?.baselineMode ?? "car",
          avoidedPerWeek: Number(res?.avoidedPerWeek ?? 0),
          avoidedPerYear: Number(res?.avoidedPerYear ?? 0),
        };
      }),
    },
    excludeContext
  );
}

export async function getAssistantRecommendation(
  userId: string,
  locationId?: string,
  force = false
) {
  const loc = await resolveUserLocation(userId, locationId);
  const targetLocId = loc?.id;
  const ctx = await buildUserAiContext(userId, targetLocId);

  // Check cached recommendation for today if not forced
  if (targetLocId && !force) {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const cached = await db.query.recommendations.findFirst({
      where: and(
        eq(recommendations.userId, userId),
        eq(recommendations.locationId, targetLocId),
        gte(recommendations.createdAt, todayStart)
      ),
      orderBy: [desc(recommendations.createdAt)],
    });

    if (cached) {
      const prevSnap = cached.contextSnapshot as { air?: { category?: string | null } };
      if (prevSnap?.air?.category === ctx.air?.category) {
        return {
          recommendation: cached.payload,
          contextSnapshot: cached.contextSnapshot,
          dataAsOf: cached.dataAsOf.toISOString(),
          aiUnavailable: false,
          cached: true,
        };
      }
    }
  }

  // If no recommendation exists yet OR user clicked Refresh (force=true)
  const res = force
    ? await generateDailyRecommendation(ctx, userId)
    : {
        // On initial page load when no DB rec exists yet, do NOT call Gemini unless user asks/refreshes!
        data: buildDeterministicDailyFallback(ctx),
        aiUnavailable: false,
      };

  if (targetLocId && force) {
    await db.insert(recommendations).values({
      userId,
      locationId: targetLocId,
      kind: "refresh",
      payload: res.data,
      contextSnapshot: ctx,
      dataAsOf: new Date(ctx.air?.observedAt ?? Date.now()),
    });
  }

  return {
    recommendation: res.data,
    contextSnapshot: ctx,
    dataAsOf: ctx.air?.observedAt ?? new Date().toISOString(),
    aiUnavailable: res.aiUnavailable,
    cached: false,
  };
}

export async function runAssistantChat(
  userId: string,
  message: string,
  opts?: { conversationId?: string; locationId?: string; excludeContext?: string[] }
) {
  let convId = opts?.conversationId;
  if (!convId) {
    const [conv] = await db
      .insert(conversations)
      .values({ userId, title: message.slice(0, 60) })
      .returning();
    convId = conv.id;
  }

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(messages.createdAt);

  const ctx = await buildUserAiContext(userId, opts?.locationId, opts?.excludeContext);
  const safetyFlag = classifySafety(message); // Deterministic, 0 Gemini calls

  await db.insert(messages).values({
    conversationId: convId,
    role: "user",
    content: message,
    safetyFlag,
  });

  if (safetyFlag === "emergency") {
    const reply = { text: EMERGENCY_FIXED_REPLY, dataLimitations: ctx.limits };
    const [saved] = await db
      .insert(messages)
      .values({
        conversationId: convId,
        role: "assistant",
        content: reply.text,
        structured: reply,
        contextSnapshot: ctx,
        safetyFlag,
        model: "safety-rule",
      })
      .returning();
    return { conversationId: convId, messageId: saved.id, contextSnapshot: ctx, safetyFlag, reply, aiUnavailable: false };
  }

  const res = await generateChatReply(
    ctx,
    message,
    userId,
    history.map((m) => ({ role: m.role, content: m.content }))
  );

  const [saved] = await db
    .insert(messages)
    .values({
      conversationId: convId,
      role: "assistant",
      content: res.data.text,
      structured: res.data,
      contextSnapshot: ctx,
      safetyFlag,
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    })
    .returning();

  return {
    conversationId: convId,
    messageId: saved.id,
    contextSnapshot: ctx,
    safetyFlag,
    reply: res.data,
    aiUnavailable: res.aiUnavailable,
  };
}

export async function listConversations(userId: string) {
  return db.query.conversations.findMany({
    where: eq(conversations.userId, userId),
    orderBy: [desc(conversations.updatedAt)],
  });
}

export async function getConversationMessages(userId: string, convId: string) {
  const conv = await db.query.conversations.findFirst({
    where: and(eq(conversations.id, convId), eq(conversations.userId, userId)),
  });
  if (!conv) throw new AppError("NOT_FOUND", 404, "Conversation not found");
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(messages.createdAt);
  return { conversation: conv, messages: msgs };
}

export async function deleteConversation(userId: string, convId: string) {
  const del = await db
    .delete(conversations)
    .where(and(eq(conversations.id, convId), eq(conversations.userId, userId)))
    .returning({ id: conversations.id });
  if (del.length === 0) throw new AppError("NOT_FOUND", 404, "Conversation not found");
  return { deleted: true };
}

// --- Planner ---

export async function getOrBuildTodayPlan(
  userId: string,
  locationId?: string,
  forceGenerate = false
) {
  const todayStr = new Date().toISOString().slice(0, 10);
  if (!forceGenerate) {
    const existing = await db.query.plans.findFirst({
      where: and(eq(plans.userId, userId), eq(plans.date, todayStr)),
      orderBy: [desc(plans.builtAt)],
    });
    if (existing) {
      const acts = await db
        .select()
        .from(planActivities)
        .where(eq(planActivities.planId, existing.id))
        .orderBy(planActivities.start);
      return {
        plan: existing,
        activities: acts,
        conditionsChanged: existing.status === "stale",
        windowStrip: buildDefaultWindowStrip(),
      };
    }
  }

  const current = await getAqiCurrent(userId, locationId);
  const fam = await db.query.familyMembers.findMany({
    where: eq(familyMembers.userId, userId),
  });
  const hasVulnerableMember = fam.some(
    (m) => m.ageGroup === "child" || m.ageGroup === "older_adult"
  );
  const cat = current.aqi.category ?? "moderate";
  const strip = buildDefaultWindowStrip(current.aqi.aqi, cat);

  const built = buildPlan(
    [
      { id: "morning-walk", title: "Morning walk", preferredHour: 7, flexible: true, type: "walk" },
      { id: "commute", title: "Daily commute", preferredHour: 9, flexible: false, type: "commute" },
      { id: "evening-exercise", title: "Evening exercise", preferredHour: 18, flexible: true, type: "exercise" },
    ],
    strip,
    new Date().toISOString(),
    { hasVulnerableMember }
  );

  const [savedPlan] = await db
    .insert(plans)
    .values({
      userId,
      date: todayStr,
      dataAsOf: new Date(current.aqi.windowEnd),
      inputsHash: built.inputsHash,
      status: "current",
    })
    .returning();

  const savedActivities =
    built.activities.length > 0
      ? await db
          .insert(planActivities)
          .values(
            built.activities.map((a) => ({
              planId: savedPlan.id,
              title: a.title,
              start: new Date(`${todayStr}T${String(a.startHour).padStart(2, "0")}:00:00+05:30`),
              end: new Date(`${todayStr}T${String(a.endHour).padStart(2, "0")}:00:00+05:30`),
              setting: a.setting,
              expectedAqi: a.expectedAqi,
              expectedCategory: a.expectedCategory,
              reason: a.reason,
              indoorAlternative: a.indoorAlternative,
              userAdded: false,
            }))
          )
          .returning()
      : [];

  return {
    plan: savedPlan,
    activities: savedActivities,
    conditionsChanged: false,
    windowStrip: strip,
  };
}

function buildDefaultWindowStrip(
  currentAqi: number | null = null,
  currentCat: AqiCategorySlug = "moderate"
): HourlyWindow[] {
  const hours = [6, 8, 10, 12, 14, 16, 18, 20, 22];
  return hours.map((h) => ({
    hour: h,
    hourLabel: h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`,
    aqi: currentAqi,
    category: currentCat,
    provider: h <= 10 ? "cpcb" : "openmeteo",
    kind: h <= 10 ? "observation" : "forecast",
  }));
}

export async function addPlannerActivity(
  userId: string,
  input: { title: string; preferredTime: string; flexible: boolean; durationMinutes: number }
) {
  const { plan } = await getOrBuildTodayPlan(userId);
  const [hh, mm] = input.preferredTime.split(":");
  const start = new Date(`${plan.date}T${hh}:${mm}:00+05:30`);
  const end = new Date(start.getTime() + input.durationMinutes * 60000);
  const [created] = await db
    .insert(planActivities)
    .values({
      planId: plan.id,
      title: input.title,
      start,
      end,
      setting: input.flexible ? "outdoor" : "indoor",
      expectedAqi: null,
      expectedCategory: "moderate",
      reason: input.flexible ? "Scheduled in preferred window" : "Indoor activity",
      userAdded: true,
    })
    .returning();
  return created;
}

export async function togglePlannerActivity(userId: string, actId: string, completed: boolean) {
  const act = await db.query.planActivities.findFirst({ where: eq(planActivities.id, actId) });
  if (!act) throw new AppError("NOT_FOUND", 404, "Activity not found");
  const plan = await db.query.plans.findFirst({
    where: and(eq(plans.id, act.planId), eq(plans.userId, userId)),
  });
  if (!plan) throw new AppError("NOT_FOUND", 404, "Activity not found");

  const [updated] = await db
    .update(planActivities)
    .set({ completedAt: completed ? new Date() : null })
    .where(eq(planActivities.id, actId))
    .returning();
  return updated;
}

export async function deletePlannerActivity(userId: string, actId: string) {
  const act = await db.query.planActivities.findFirst({ where: eq(planActivities.id, actId) });
  if (!act) throw new AppError("NOT_FOUND", 404, "Activity not found");
  const plan = await db.query.plans.findFirst({
    where: and(eq(plans.id, act.planId), eq(plans.userId, userId)),
  });
  if (!plan) throw new AppError("NOT_FOUND", 404, "Activity not found");

  await db.delete(planActivities).where(eq(planActivities.id, actId));
  return { deleted: true };
}

// --- Family & Indoor ---

export async function listFamily(userId: string) {
  return db.query.familyMembers.findMany({
    where: eq(familyMembers.userId, userId),
    orderBy: familyMembers.createdAt,
  });
}

export async function createFamilyMember(
  userId: string,
  input: { name: string; ageGroup: "child" | "teen" | "adult" | "older_adult"; lifestyle: "student" | "professional" | "homemaker" | "retired" | "other"; activities: string[] }
) {
  const [created] = await db
    .insert(familyMembers)
    .values({ userId, ...input })
    .returning();
  return created;
}

export async function patchFamilyMember(
  userId: string,
  memberId: string,
  patch: {
    name?: string;
    ageGroup?: "child" | "teen" | "adult" | "older_adult";
    lifestyle?: "student" | "professional" | "homemaker" | "retired" | "other";
    activities?: string[];
  }
) {
  const [updated] = await db
    .update(familyMembers)
    .set({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.ageGroup !== undefined ? { ageGroup: patch.ageGroup } : {}),
      ...(patch.lifestyle !== undefined ? { lifestyle: patch.lifestyle } : {}),
      ...(patch.activities !== undefined ? { activities: patch.activities } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(familyMembers.id, memberId), eq(familyMembers.userId, userId)))
    .returning();
  if (!updated) throw new AppError("NOT_FOUND", 404, "Member not found");
  return updated;
}

export async function deleteFamilyMember(userId: string, memberId: string) {
  const del = await db
    .delete(familyMembers)
    .where(and(eq(familyMembers.id, memberId), eq(familyMembers.userId, userId)))
    .returning({ id: familyMembers.id });
  if (del.length === 0) throw new AppError("NOT_FOUND", 404, "Member not found");
  return { deleted: true };
}

export async function getIndoorProfile(userId: string) {
  const row = await db.query.indoorProfiles.findFirst({
    where: eq(indoorProfiles.userId, userId),
  });
  if (row) return row;
  const [created] = await db.insert(indoorProfiles).values({ userId }).returning();
  return created;
}

export async function updateIndoorProfile(userId: string, input: IndoorProfile) {
  const [updated] = await db
    .insert(indoorProfiles)
    .values({ userId, ...input })
    .onConflictDoUpdate({
      target: indoorProfiles.userId,
      set: { ...input, updatedAt: new Date() },
    })
    .returning();
  return updated;
}

export async function getIndoorRecommendations(userId: string, locationId?: string) {
  const profile = await getIndoorProfile(userId);
  const current = await getAqiCurrent(userId, locationId);
  const fam = await db.query.familyMembers.findMany({
    where: eq(familyMembers.userId, userId),
  });
  const cat = current.aqi.category ?? "moderate";
  return evaluateIndoorRules(cat, profile, buildDefaultWindowStrip(current.aqi.aqi, cat), fam);
}

// --- Simulator ---

export async function listEmissionFactors() {
  const cached = await cacheGet<
    {
      mode: "car" | "two_wheeler" | "auto" | "bus" | "metro" | "cycling" | "walking";
      kgCo2ePerPkm: number;
      source: string;
      publication: string;
      version: string;
      geography: string;
      occupancyAssumption: string;
    }[]
  >("sim:factors:v1");
  if (cached) return cached;

  const rows = await db.select().from(emissionFactors);
  const mapped = rows.map((r) => ({
    mode: r.mode,
    kgCo2ePerPkm: Number(r.kgCo2ePerPkm),
    source: r.source,
    publication: r.publication,
    version: r.version,
    geography: r.geography,
    occupancyAssumption: r.occupancyAssumption,
  }));
  await cacheSet("sim:factors:v1", mapped, 3600);
  return mapped;
}

export async function runCommuteSimulation(input: CommuteSimRequest) {
  const factors = await listEmissionFactors();
  return computeCommuteEmissions(input, factors);
}

export function runExposureSimulation(
  segments: { mode: CommuteSimRequest["baselineMode"]; minutes: number }[]
) {
  return computeExposureIndicator(segments, null);
}

export async function listSimulatorScenarios(userId: string) {
  const rows = await db
    .select()
    .from(simulatorScenarios)
    .where(eq(simulatorScenarios.userId, userId))
    .orderBy(desc(simulatorScenarios.savedAt));
  return { scenarios: rows };
}

export async function saveSimulatorScenario(
  userId: string,
  inputs: CommuteSimRequest,
  result: ReturnType<typeof computeCommuteEmissions>
) {
  const [created] = await db
    .insert(simulatorScenarios)
    .values({
      userId,
      inputs,
      result,
      factorVersion: result.factorVersion,
    })
    .returning();
  return created;
}

export async function deleteSimulatorScenario(userId: string, scenarioId: string) {
  const del = await db
    .delete(simulatorScenarios)
    .where(and(eq(simulatorScenarios.id, scenarioId), eq(simulatorScenarios.userId, userId)))
    .returning({ id: simulatorScenarios.id });
  if (del.length === 0) throw new AppError("NOT_FOUND", 404, "Scenario not found");
  return { deleted: true };
}

// --- Community ---

export async function getCommunityHotspots(lat: number, lng: number, radiusKm: number) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000);
  const reports = await db
    .select()
    .from(communityReports)
    .where(gte(communityReports.createdAt, sevenDaysAgo))
    .orderBy(desc(communityReports.createdAt))
    .limit(50);

  const activeStations = await db.query.stations.findMany({
    where: eq(stations.active, true),
    limit: 30,
  });

  const filteredStations = activeStations.filter((st) => {
    const dLat = st.point.lat - lat;
    const dLng = st.point.lng - lng;
    return Math.sqrt(dLat * dLat + dLng * dLng) * 111 <= radiusKm;
  });

  return {
    reports: reports
      .filter((r) => r.status !== "removed")
      .map((r) => ({
        id: r.id,
        category: r.category,
        description: r.description,
        roundedPoint: r.roundedPoint,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    stations: filteredStations.map((s) => ({
      id: s.id,
      name: s.name,
      city: s.city,
      provider: s.provider,
      point: s.point,
    })),
  };
}

export async function createCommunityReport(
  userId: string,
  input: { category: "smoke" | "dust" | "burning_waste" | "vehicle_exhaust" | "industrial" | "other"; description: string; lat: number; lng: number }
) {
  const sanitised = sanitiseReportDescription(input.description);
  if (!sanitised.ok) {
    throw new AppError("VALIDATION_FAILED", 422, sanitised.reason ?? "Invalid description", {
      fields: { description: sanitised.reason ?? "Invalid description" },
    });
  }
  const roundedPoint = roundPointTo500m(input.lat, input.lng);
  const [created] = await db
    .insert(communityReports)
    .values({
      userId,
      category: input.category,
      description: sanitised.text,
      roundedPoint,
      status: "pending",
    })
    .returning();

  return {
    id: created.id,
    category: created.category,
    description: created.description,
    roundedPoint: created.roundedPoint,
    status: created.status,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function deleteCommunityReport(userId: string, reportId: string) {
  const del = await db
    .delete(communityReports)
    .where(and(eq(communityReports.id, reportId), eq(communityReports.userId, userId)))
    .returning({ id: communityReports.id });
  if (del.length === 0) throw new AppError("NOT_FOUND", 404, "Report not found");
  return { deleted: true };
}

export async function flagCommunityReport(userId: string, reportId: string) {
  const report = await db.query.communityReports.findFirst({
    where: eq(communityReports.id, reportId),
  });
  if (!report) throw new AppError("NOT_FOUND", 404, "Report not found");

  const existingFlag = await db.query.reportFlags.findFirst({
    where: and(eq(reportFlags.reportId, reportId), eq(reportFlags.userId, userId)),
  });
  if (existingFlag) {
    throw new AppError("VALIDATION_FAILED", 422, "You have already flagged this report");
  }

  await db.insert(reportFlags).values({ reportId, userId });
  const nextCount = report.flagCount + 1;
  const nextStatus = nextCount >= 3 ? "removed" : report.status;

  const [updated] = await db
    .update(communityReports)
    .set({ flagCount: nextCount, status: nextStatus, updatedAt: new Date() })
    .where(eq(communityReports.id, reportId))
    .returning();

  return {
    id: updated.id,
    flagCount: updated.flagCount,
    status: updated.status,
  };
}

export async function moderateReport(
  adminUserId: string,
  reportId: string,
  status: "verified" | "not_verified" | "removed"
) {
  const [updated] = await db
    .update(communityReports)
    .set({ status, moderatedBy: adminUserId, moderatedAt: new Date(), updatedAt: new Date() })
    .where(eq(communityReports.id, reportId))
    .returning();
  if (!updated) throw new AppError("NOT_FOUND", 404, "Report not found");

  await db.insert(auditLog).values({
    userId: adminUserId,
    action: "moderate_report",
    entity: "community_reports",
    entityId: reportId,
    meta: { status },
  });

  return updated;
}

// --- Notifications, Export, Account Delete, Gemini Usage ---

export async function getNotifications(userId: string) {
  const row = await db.query.notificationPrefs.findFirst({
    where: eq(notificationPrefs.userId, userId),
  });
  if (row) return row;
  const [created] = await db.insert(notificationPrefs).values({ userId }).returning();
  return created;
}

export async function updateNotifications(userId: string, prefs: NotificationPrefs) {
  const [updated] = await db
    .insert(notificationPrefs)
    .values({ userId, ...prefs })
    .onConflictDoUpdate({
      target: notificationPrefs.userId,
      set: { ...prefs, updatedAt: new Date() },
    })
    .returning();
  return updated;
}

export async function exportUserData(userId: string) {
  const me = await getMe(userId);
  const fam = await listFamily(userId);
  const indoor = await getIndoorProfile(userId);
  const notifs = await getNotifications(userId);
  const scenarios = await listSimulatorScenarios(userId);
  const convs = await listConversations(userId);
  const reps = await db
    .select()
    .from(communityReports)
    .where(eq(communityReports.userId, userId));

  return {
    exportedAt: new Date().toISOString(),
    ...me,
    familyMembers: fam,
    indoorProfile: indoor,
    notificationPrefs: notifs,
    simulatorScenarios: scenarios.scenarios,
    conversations: convs,
    communityReports: reps,
  };
}

export async function deleteAccount(userId: string) {
  // Anonymise community reports (userId -> null), cascade everything else
  await db
    .update(communityReports)
    .set({ userId: null })
    .where(eq(communityReports.userId, userId));

  await db.delete(sessions).where(eq(sessions.userId, userId));
  await db.delete(users).where(eq(users.id, userId));

  await db.insert(auditLog).values({
    userId: null,
    action: "delete_account",
    entity: "users",
    entityId: "redacted",
    meta: {},
  });

  return { deleted: true };
}

export async function getGeminiUsageStats(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || user.role !== "admin") {
    throw new AppError("FORBIDDEN", 403, "Admin access required");
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const rows = await db
    .select()
    .from(geminiUsage)
    .where(gte(geminiUsage.createdAt, today))
    .orderBy(desc(geminiUsage.createdAt));

  const totalCalls = rows.length;
  const cacheHits = rows.filter((r) => r.cacheHit).length;
  const tokensIn = rows.reduce((s, r) => s + r.tokensIn, 0);
  const tokensOut = rows.reduce((s, r) => s + r.tokensOut, 0);

  return {
    callsToday: totalCalls,
    cacheHits,
    cacheHitRate: totalCalls > 0 ? Number((cacheHits / totalCalls).toFixed(2)) : 0,
    tokensIn,
    tokensOut,
    dailyCap: Number(process.env.GEMINI_DAILY_CAP ?? 200),
    recent: rows.slice(0, 30),
  };
}
