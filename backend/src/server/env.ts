import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_URL: z.string().url("AUTH_URL must be a valid URL"),
  APP_URL: z.string().url("APP_URL must be a valid URL").optional(),
  AUTH_TRUST_HOST: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  DATA_GOV_API_KEY: z.string().min(1, "DATA_GOV_API_KEY is required"),
  CPCB_RESOURCE_ID: z.string().min(1, "CPCB_RESOURCE_ID is required"),
  OPENAQ_API_KEY: z.string().min(1, "OPENAQ_API_KEY is required"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  GEMINI_DAILY_CAP: z.coerce.number().int().positive().default(200),
  UPSTASH_REDIS_REST_URL: z.string().min(1, "UPSTASH_REDIS_REST_URL is required"),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "UPSTASH_REDIS_REST_TOKEN is required"),
  CRON_SECRET: z.string().min(1, "CRON_SECRET is required"),
  ADMIN_EMAILS: z.string().default(""),
  USE_MOCKS: z.string().default("false"),
  PORT: z.coerce.number().int().positive().default(4000),
});

export type ValidatedEnv = z.infer<typeof EnvSchema>;

let cachedEnv: ValidatedEnv | null = null;

export function validateEnv(source: Record<string, string | undefined> = process.env): ValidatedEnv {
  const res = EnvSchema.safeParse(source);
  if (!res.success) {
    const missing = res.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`Environment validation failed:\n- ${missing.join("\n- ")}`);
  }
  cachedEnv = res.data;
  return cachedEnv;
}

export function getEnv(): ValidatedEnv {
  if (cachedEnv) return cachedEnv;
  return validateEnv();
}
