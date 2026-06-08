import { type SQL, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const lower = (email: AnyPgColumn): SQL => {
  return sql`lower(${email})`;
};

export const fitnessExperienceEnum = pgEnum("fitness_experience", [
  "beginner",
  "intermediate",
  "advanced",
]);

export const lifestyleActivityEnum = pgEnum("lifestyle_activity_level", [
  "desk_job",
  "active_job",
  "shift_work",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "running",
  "cycling",
  "rowing",
  "strength",
  "mobility",
  "recovery",
  "cross_training",
]);

export const goalTypeEnum = pgEnum("goal_type", [
  "race",
  "pace",
  "consistency",
  "weight_loss",
  "general_fitness",
]);

export const goalStatusEnum = pgEnum("goal_status", [
  "active",
  "paused",
  "completed",
  "archived",
]);

export const availabilityPartOfDayEnum = pgEnum("availability_part_of_day", [
  "morning",
  "midday",
  "evening",
  "custom",
]);

export const equipmentTypeEnum = pgEnum("equipment_type", [
  "outdoor_running",
  "track",
  "gym",
  "dumbbells",
  "barbell",
  "peloton",
  "bike",
  "rower",
  "treadmill",
  "bodyweight",
  "mobility",
]);

export const preferenceLevelEnum = pgEnum("preference_level", [
  "love",
  "like",
  "neutral",
  "avoid",
]);

export const planStatusEnum = pgEnum("plan_status", [
  "draft",
  "active",
  "superseded",
  "archived",
]);

export const workoutStatusEnum = pgEnum("workout_status", [
  "scheduled",
  "completed",
  "missed",
  "modified",
  "cancelled",
]);

export const adjustmentReasonEnum = pgEnum("adjustment_reason", [
  "activity_import",
  "missed_workout",
  "schedule_change",
  "fatigue",
  "goal_change",
  "coach_chat",
  "manual",
]);

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid().primaryKey().defaultRandom(),
    displayName: text().notNull(),
    email: text().notNull(),
    birthYear: integer(),
    heightCm: integer(),
    weightKg: integer(),
    fitnessExperience: fitnessExperienceEnum().notNull().default("beginner"),
    lifestyleActivityLevel: lifestyleActivityEnum()
      .notNull()
      .default("desk_job"),
    averageSleepHours: integer(),
    weeklyWorkoutTarget: integer(),
    notes: text(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp().defaultNow().notNull(),
  },
  (table) => [uniqueIndex("user_profiles_email_unique").on(lower(table.email))],
);

export const userAvailabilityWindows = pgTable("user_availability_windows", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  label: text().notNull(),
  dayOfWeek: integer().notNull(),
  startMinute: integer().notNull(),
  endMinute: integer().notNull(),
  partOfDay: availabilityPartOfDayEnum().notNull().default("custom"),
  effectiveFrom: timestamp({ withTimezone: true }).notNull(),
  effectiveTo: timestamp({ withTimezone: true }),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

export const userEquipment = pgTable("user_equipment", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  equipmentType: equipmentTypeEnum().notNull(),
  label: text().notNull(),
  isAvailable: boolean().notNull().default(true),
  notes: text(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

export const userGoals = pgTable("user_goals", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  goalType: goalTypeEnum().notNull(),
  activityType: activityTypeEnum(),
  summary: text().notNull(),
  details: text(),
  targetDate: timestamp({ withTimezone: true }),
  targetValue: text(),
  unit: text(),
  status: goalStatusEnum().notNull().default("active"),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

export const userActivityPreferences = pgTable("user_activity_preferences", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  activityType: activityTypeEnum().notNull(),
  preferenceLevel: preferenceLevelEnum().notNull().default("neutral"),
  notes: text(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

export const stravaConnections = pgTable(
  "strava_connections",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    stravaAthleteId: text().notNull(),
    athleteUsername: text(),
    athleteFirstName: text(),
    athleteLastName: text(),
    accessToken: text().notNull(),
    refreshToken: text().notNull(),
    tokenType: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    redirectUri: text().notNull(),
    scope: text().notNull(),
    lastSyncedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp().defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("strava_connections_user_unique").on(table.userId),
    uniqueIndex("strava_connections_athlete_unique").on(table.stravaAthleteId),
  ],
);

export const importedActivities = pgTable(
  "imported_activities",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    stravaActivityId: text().notNull(),
    activityType: activityTypeEnum().notNull(),
    title: text().notNull(),
    startedAt: timestamp({ withTimezone: true }).notNull(),
    durationMinutes: integer().notNull(),
    distanceMeters: integer(),
    movingTimeMinutes: integer(),
    averageHeartRate: integer(),
    perceivedEffort: integer(),
    summary: jsonb().$type<Record<string, unknown>>(),
    importedAt: timestamp().defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("imported_activities_strava_id_unique").on(
      table.stravaActivityId,
    ),
  ],
);

export const trainingPlans = pgTable("training_plans", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  weekOf: timestamp({ withTimezone: true }).notNull(),
  status: planStatusEnum().notNull().default("draft"),
  goalSnapshot: jsonb().$type<Record<string, unknown>>(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

export const plannedWorkouts = pgTable("planned_workouts", {
  id: uuid().primaryKey().defaultRandom(),
  planId: uuid()
    .notNull()
    .references(() => trainingPlans.id, { onDelete: "cascade" }),
  userId: uuid()
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  activityType: activityTypeEnum().notNull(),
  title: text().notNull(),
  scheduledFor: timestamp({ withTimezone: true }).notNull(),
  durationMinutes: integer(),
  intensity: text(),
  rationale: text().notNull(),
  status: workoutStatusEnum().notNull().default("scheduled"),
  adjustmentContext: jsonb().$type<Record<string, unknown>>(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

export const planAdjustments = pgTable("plan_adjustments", {
  id: uuid().primaryKey().defaultRandom(),
  planId: uuid()
    .notNull()
    .references(() => trainingPlans.id, { onDelete: "cascade" }),
  userId: uuid()
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  reason: adjustmentReasonEnum().notNull(),
  summary: text().notNull(),
  details: jsonb().$type<Record<string, unknown>>(),
  createdAt: timestamp().defaultNow().notNull(),
});

export type NewUserProfile = typeof userProfiles.$inferInsert;
export type NewUserGoal = typeof userGoals.$inferInsert;
export type NewImportedActivity = typeof importedActivities.$inferInsert;
export type NewTrainingPlan = typeof trainingPlans.$inferInsert;
