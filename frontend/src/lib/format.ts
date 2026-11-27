import { format, formatDistanceToNow } from "date-fns";

export function formatIST(isoString: string, pattern = "HH:mm"): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "--:-- IST";

  if (pattern === "HH:mm") {
    const formatted = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
    return `${formatted} IST`;
  }

  // Fallback for custom patterns
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
  const ist = new Date(utcMs + 5.5 * 3600000);
  return `${format(ist, pattern)} IST`;
}

export function formatRelativeTime(isoString: string): string {
  try {
    return formatDistanceToNow(new Date(isoString), { addSuffix: true });
  } catch {
    return "recently";
  }
}

export function formatNumber(
  value: number,
  options?: { decimals?: number; commas?: boolean }
): string {
  const decimals = options?.decimals ?? 0;
  const commas = options?.commas ?? true;
  if (commas) {
    return value.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return value.toFixed(decimals);
}

export type AqiCategory =
  | "Good"
  | "Satisfactory"
  | "Moderate"
  | "Poor"
  | "Very Poor"
  | "Severe"
  | "Unavailable";

export function getAqiColors(category: AqiCategory): {
  bg: string;
  text: string;
  token: string;
  dashed?: boolean;
} {
  switch (category) {
    case "Good":
      return { bg: "var(--aqi-good)", text: "#10291a", token: "--aqi-good" };
    case "Satisfactory":
      return {
        bg: "var(--aqi-satisfactory)",
        text: "#10291a",
        token: "--aqi-satisfactory",
      };
    case "Moderate":
      return {
        bg: "var(--aqi-moderate)",
        text: "#10291a",
        token: "--aqi-moderate",
      };
    case "Poor":
      return { bg: "var(--aqi-poor)", text: "#10291a", token: "--aqi-poor" };
    case "Very Poor":
      return {
        bg: "var(--aqi-verypoor)",
        text: "#ffffff",
        token: "--aqi-verypoor",
      };
    case "Severe":
      return {
        bg: "var(--aqi-severe)",
        text: "#ffffff",
        token: "--aqi-severe",
      };
    default:
      return {
        bg: "var(--aqi-unavailable)",
        text: "#10291a",
        token: "--aqi-unavailable",
        dashed: true,
      };
  }
}

export type FreshnessLevel = "fresh" | "aging" | "stale";

export function getFreshnessLevel(
  observedAtIso: string,
  freshMinutes = 90,
  agingMinutes = 180
): FreshnessLevel {
  const diffMin = (Date.now() - new Date(observedAtIso).getTime()) / 60000;
  if (diffMin <= freshMinutes) return "fresh";
  if (diffMin <= agingMinutes) return "aging";
  return "stale";
}
