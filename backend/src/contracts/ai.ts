import { z } from "zod";

export const AiSectionSchema = z.object({
  summary: z.string().min(1),
  actions: z.array(z.string().min(1)).min(1),
});

export const DailyRecommendationSchema = z.object({
  dailySummary: z.string().min(1),
  airQualityStatus: z.string().min(1),
  commute: AiSectionSchema,
  study: AiSectionSchema,
  exercise: AiSectionSchema,
  indoor: AiSectionSchema,
  sustainableActions: AiSectionSchema,
  dataLimitations: z.array(z.string().min(1)).min(1),
});
export type DailyRecommendation = z.infer<typeof DailyRecommendationSchema>;

export const ChatReplySchema = z.object({
  text: z.string().min(1),
  sections: z
    .object({
      commute: AiSectionSchema.optional(),
      study: AiSectionSchema.optional(),
      exercise: AiSectionSchema.optional(),
      indoor: AiSectionSchema.optional(),
      sustainableActions: AiSectionSchema.optional(),
    })
    .optional(),
  dataLimitations: z.array(z.string().min(1)).min(1),
});
export type ChatReply = z.infer<typeof ChatReplySchema>;

export const PlanReasonsSchema = z.object({
  reasons: z.record(z.string().min(1)),
});
export type PlanReasons = z.infer<typeof PlanReasonsSchema>;

export const IndoorTipsSchema = z.object({
  indoorAirRecommendations: z.array(
    z.object({
      group: z.enum(["ventilation", "sources", "purifier", "cleaning"]),
      title: z.string().min(1),
      body: z.string().min(1),
    })
  ),
  familyTips: z.array(
    z.object({
      ageGroup: z.enum(["child", "teen", "adult", "older_adult"]),
      tips: z.array(z.string().min(1)),
    })
  ),
});
export type IndoorTips = z.infer<typeof IndoorTipsSchema>;

export const SafetyFlagSchema = z.enum(["none", "health_symptom", "emergency"]);
export type SafetyFlag = z.infer<typeof SafetyFlagSchema>;

export const SafetyClassificationSchema = z.object({
  flag: SafetyFlagSchema,
});

export const RecommendRequestSchema = z.object({
  locationId: z.string().uuid().optional(),
  force: z.boolean().default(false),
});

export const ChatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(1500),
  excludeContext: z.array(z.string()).default([]),
});
