import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Rounds coordinates to a ~500 m grid (0.005°).
 * Exact coordinates are never stored on community reports or served in locations.
 */
export function roundPointTo500m(
  lat: number,
  lng: number
): { lat: number; lng: number } {
  return {
    lat: Number((Math.round(lat / 0.005) * 0.005).toFixed(4)),
    lng: Number((Math.round(lng / 0.005) * 0.005).toFixed(4)),
  };
}

const PROFANITY_LIST = ["fuck", "shit", "bitch", "asshole", "bastard"];

export function sanitiseReportDescription(raw: string): {
  ok: boolean;
  text: string;
  reason?: string;
} {
  const lower = raw.toLowerCase();
  if (PROFANITY_LIST.some((w) => lower.includes(w))) {
    return {
      ok: false,
      text: "",
      reason: "Please keep descriptions respectful and free of profanity.",
    };
  }

  // Strip URLs, emails, and phone numbers
  const cleaned = raw
    .replace(/https?:\/\/\S+|www\.\S+/gi, "[link removed]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email removed]")
    .replace(/(?:\+?\d[\d\s-]{7,}\d)/g, "[number removed]")
    .trim();

  return { ok: true, text: cleaned };
}

export function signSessionToken(userId: string): string {
  const secret = process.env.AUTH_SECRET ?? "dev-auth-secret";
  const payload = `${userId}.${Date.now()}`;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): string | null {
  const secret = process.env.AUTH_SECRET ?? "dev-auth-secret";
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, ts, sig] = parts;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${userId}.${ts}`)
    .digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  return userId;
}
