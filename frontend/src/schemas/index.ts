import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    acceptedDisclaimer: z.literal(true, {
      error: "Please confirm you understand AERIQ provides guidance only",
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const familyMemberSchema = z.object({
  name: z.string().min(1, "Enter a name").max(40),
  ageGroup: z.enum(["Child", "Teen", "Adult", "Older adult"]),
  lifestyle: z.enum([
    "Student",
    "Working professional",
    "Homemaker",
    "Retired",
    "Other",
  ]),
  activities: z.array(z.string()).default([]),
});

export const indoorProfileSchema = z.object({
  gasOrWoodCooking: z.boolean(),
  incenseOrCoils: z.boolean(),
  smokingIndoors: z.boolean(),
  pets: z.boolean(),
  constructionNearby: z.boolean(),
  hasPurifier: z.boolean(),
  roomSizeM2: z.number().min(5).max(300).optional(),
});

export const simulatorInputSchema = z.object({
  distanceKm: z.number().min(0.5).max(200),
  tripsPerWeek: z.number().min(1).max(30),
  baselineMode: z.enum([
    "car",
    "two_wheeler",
    "auto",
    "bus",
    "metro",
    "cycling",
    "walking",
  ]),
  alternativeModes: z.array(
    z.enum([
      "car",
      "two_wheeler",
      "auto",
      "bus",
      "metro",
      "cycling",
      "walking",
    ])
  ),
});

export const communityReportSchema = z.object({
  category: z.enum([
    "Smoke",
    "Dust",
    "Burning waste",
    "Vehicle exhaust",
    "Industrial",
    "Other",
  ]),
  description: z
    .string()
    .min(5, "Describe what you observed")
    .max(280, "Keep under 280 characters"),
  lat: z.number(),
  lng: z.number(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type FamilyMemberInput = z.infer<typeof familyMemberSchema>;
export type IndoorProfileInput = z.infer<typeof indoorProfileSchema>;
export type SimulatorInput = z.infer<typeof simulatorInputSchema>;
export type CommunityReportInput = z.infer<typeof communityReportSchema>;
