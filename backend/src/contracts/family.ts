import { z } from "zod";
import { LifestyleSchema } from "./auth";

export const AgeGroupSchema = z.enum(["child", "teen", "adult", "older_adult"]);
export type AgeGroup = z.infer<typeof AgeGroupSchema>;

export const CreateFamilyMemberRequestSchema = z.object({
  name: z.string().trim().min(1).max(60),
  ageGroup: AgeGroupSchema,
  lifestyle: LifestyleSchema,
  activities: z.array(z.string()).default([]),
});

export const PatchFamilyMemberRequestSchema =
  CreateFamilyMemberRequestSchema.partial();

export const IndoorProfileSchema = z.object({
  cookingFuel: z.enum(["lpg", "wood", "electric", "other"]),
  incense: z.boolean(),
  indoorSmoking: z.boolean(),
  pets: z.boolean(),
  constructionNearby: z.boolean(),
  hasPurifier: z.boolean(),
  roomSizeM2: z.number().min(4).max(400).nullable(),
});
export type IndoorProfile = z.infer<typeof IndoorProfileSchema>;

export const IndoorRecommendRequestSchema = z.object({
  locationId: z.string().uuid().optional(),
});
