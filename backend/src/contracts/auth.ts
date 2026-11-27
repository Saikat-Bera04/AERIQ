import { z } from "zod";

export const LifestyleSchema = z.enum([
  "student",
  "professional",
  "homemaker",
  "retired",
  "other",
]);
export type Lifestyle = z.infer<typeof LifestyleSchema>;

export const RegisterRequestSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  acceptedDisclaimer: z.literal(true, {
    errorMap: () => ({
      message: "Please confirm you understand AERIQ gives guidance, not medical advice",
    }),
  }),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const ActivityPreferenceSchema = z.object({
  name: z.string().min(1).max(60),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm format"),
  flexible: z.boolean().default(true),
});

export const PatchProfileRequestSchema = z.object({
  lifestyle: LifestyleSchema.optional(),
  transportModes: z.array(z.string().min(1)).max(7).optional(),
  activities: z.array(ActivityPreferenceSchema).max(12).optional(),
  units: z.enum(["metric"]).optional(),
  language: z.enum(["en"]).optional(),
});
export type PatchProfileRequest = z.infer<typeof PatchProfileRequestSchema>;

export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const CreateLocationRequestSchema = z.object({
  label: z.string().trim().min(1).max(60),
  city: z.string().trim().min(1).max(80),
  point: GeoPointSchema.optional(),
  isDefault: z.boolean().default(false),
});
export type CreateLocationRequest = z.infer<typeof CreateLocationRequestSchema>;

export const PatchLocationRequestSchema = z.object({
  label: z.string().trim().min(1).max(60).optional(),
  isDefault: z.boolean().optional(),
});

export const SyncLocationRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  city: z.string().trim().min(1).max(80).optional(),
  label: z.string().trim().min(1).max(60).optional(),
  autoSync: z.boolean().default(true),
});
export type SyncLocationRequest = z.infer<typeof SyncLocationRequestSchema>;

export const NotificationPrefsSchema = z.object({
  dailySummary: z.boolean(),
  categoryChangeAlerts: z.boolean(),
  planChangedAlerts: z.boolean(),
  quietStart: z.string().regex(/^\d{2}:\d{2}$/),
  quietEnd: z.string().regex(/^\d{2}:\d{2}$/),
});
export type NotificationPrefs = z.infer<typeof NotificationPrefsSchema>;

export const DeleteAccountRequestSchema = z.object({
  confirm: z.literal("DELETE"),
});
