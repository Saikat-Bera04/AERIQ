import { z } from "zod";
import { AqiCategoryEnum } from "./aqi";
import { ReadingKindSchema } from "./common";

export const WindowStripSegmentSchema = z.object({
  hour: z.number().int().min(0).max(23),
  hourLabel: z.string(),
  aqi: z.number().int().nullable(),
  category: AqiCategoryEnum.nullable(),
  provider: z.string(),
  kind: ReadingKindSchema,
});
export type WindowStripSegment = z.infer<typeof WindowStripSegmentSchema>;

export const PlannerActivitySchema = z.object({
  id: z.string(),
  title: z.string(),
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
  setting: z.enum(["outdoor", "indoor"]),
  expectedAqi: z.number().int().nullable(),
  expectedCategory: AqiCategoryEnum.nullable(),
  reason: z.string(),
  indoorAlternative: z
    .object({
      title: z.string(),
      reason: z.string(),
    })
    .nullable(),
  completedAt: z.string().datetime({ offset: true }).nullable(),
  userAdded: z.boolean(),
});
export type PlannerActivityDto = z.infer<typeof PlannerActivitySchema>;

export const GeneratePlanRequestSchema = z.object({
  locationId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const CreatePlannerActivityRequestSchema = z.object({
  title: z.string().trim().min(1).max(100),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/),
  flexible: z.boolean().default(true),
  durationMinutes: z.number().int().min(15).max(240).default(45),
});

export const PatchPlannerActivityRequestSchema = z.object({
  completed: z.boolean(),
});
