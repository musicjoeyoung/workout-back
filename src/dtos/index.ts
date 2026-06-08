import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import * as schema from "../db/schema";

export const ZUserProfileInsert = createInsertSchema(schema.userProfiles, {
  email: () => z.email(),
}).pick({
  displayName: true,
  email: true,
  fitnessExperience: true,
  lifestyleActivityLevel: true,
});

export const ZUserProfileSelect = createSelectSchema(schema.userProfiles, {
  id: () => z.uuid(),
  email: () => z.email(),
});

export const ZGoalInsert = createInsertSchema(schema.userGoals).pick({
  goalType: true,
  activityType: true,
  summary: true,
  details: true,
  targetDate: true,
  targetValue: true,
  unit: true,
});

export const ZAvailabilityWindowInsert = createInsertSchema(
  schema.userAvailabilityWindows,
).pick({
  label: true,
  dayOfWeek: true,
  startMinute: true,
  endMinute: true,
  partOfDay: true,
  effectiveFrom: true,
  effectiveTo: true,
});

export const ZCoachAdjustmentRequest = z.object({
  message: z.string().min(1),
  sleepHours: z.number().int().min(0).max(24).optional(),
  availableMinutes: z.number().int().positive().optional(),
  soreness: z.boolean().optional(),
});

export const ZPlanPreviewProfile = z.object({
  displayName: z.string().min(1),
  email: z.email(),
  fitnessExperience: z.enum(schema.fitnessExperienceEnum.enumValues),
  lifestyleActivityLevel: z.enum(schema.lifestyleActivityEnum.enumValues),
  averageSleepHours: z.number().int().min(0).max(24).optional(),
  weeklyWorkoutTarget: z.number().int().min(1).max(7),
});

export const ZPlanPreviewGoal = z.object({
  goalType: z.enum(schema.goalTypeEnum.enumValues),
  activityType: z.enum(schema.activityTypeEnum.enumValues).optional(),
  summary: z.string().min(1),
  targetDate: z.string().optional(),
});

export const ZPlanPreviewAvailabilityWindow = z.object({
  label: z.string().min(1),
  dayOfWeek: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440),
  partOfDay: z.enum(schema.availabilityPartOfDayEnum.enumValues),
});

export const ZPlanPreviewRequest = z.object({
  profile: ZPlanPreviewProfile,
  goal: ZPlanPreviewGoal,
  availability: z.array(ZPlanPreviewAvailabilityWindow).min(1),
  equipment: z.array(z.enum(schema.equipmentTypeEnum.enumValues)).default([]),
  preferences: z
    .array(
      z.object({
        activityType: z.enum(schema.activityTypeEnum.enumValues),
        preferenceLevel: z.enum(schema.preferenceLevelEnum.enumValues),
      }),
    )
    .default([]),
});

export const ZStravaConnectRequest = z.object({
  userId: z.uuid(),
  redirectUri: z.url(),
});

export const ZStravaWebhookQuery = z.object({
  "hub.mode": z.string(),
  "hub.challenge": z.string(),
  "hub.verify_token": z.string(),
});

export const ZStravaWebhookEvent = z.object({
  aspect_type: z.enum(["create", "update", "delete"]),
  event_time: z.number().int().positive(),
  object_id: z.number().int().positive(),
  object_type: z.enum(["activity", "athlete"]),
  owner_id: z.number().int().positive(),
  subscription_id: z.number().int().positive(),
  updates: z.record(z.string(), z.string()).optional(),
});
