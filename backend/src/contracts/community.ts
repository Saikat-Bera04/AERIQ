import { z } from "zod";
import { GeoPointSchema } from "./auth";

export const ReportCategorySchema = z.enum([
  "smoke",
  "dust",
  "burning_waste",
  "vehicle_exhaust",
  "industrial",
  "other",
]);
export type ReportCategory = z.infer<typeof ReportCategorySchema>;

export const ReportStatusSchema = z.enum([
  "pending",
  "verified",
  "not_verified",
  "removed",
]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const CreateCommunityReportRequestSchema = z.object({
  category: ReportCategorySchema,
  description: z.string().trim().min(5).max(280),
  lat: GeoPointSchema.shape.lat,
  lng: GeoPointSchema.shape.lng,
});

export const ModerationStatusRequestSchema = z.object({
  status: z.enum(["verified", "not_verified", "removed"]),
});

export const HotspotsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).default(22.5726),
  lng: z.coerce.number().min(-180).max(180).default(88.3639),
  radiusKm: z.coerce.number().min(1).max(50).default(10),
});
