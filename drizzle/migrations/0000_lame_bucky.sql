CREATE TYPE "public"."activity_type" AS ENUM('running', 'cycling', 'rowing', 'strength', 'mobility', 'recovery', 'cross_training');--> statement-breakpoint
CREATE TYPE "public"."adjustment_reason" AS ENUM('activity_import', 'missed_workout', 'schedule_change', 'fatigue', 'goal_change', 'coach_chat', 'manual');--> statement-breakpoint
CREATE TYPE "public"."availability_part_of_day" AS ENUM('morning', 'midday', 'evening', 'custom');--> statement-breakpoint
CREATE TYPE "public"."equipment_type" AS ENUM('outdoor_running', 'track', 'gym', 'dumbbells', 'barbell', 'peloton', 'bike', 'rower', 'treadmill', 'bodyweight', 'mobility');--> statement-breakpoint
CREATE TYPE "public"."fitness_experience" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('active', 'paused', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."goal_type" AS ENUM('race', 'pace', 'consistency', 'weight_loss', 'general_fitness');--> statement-breakpoint
CREATE TYPE "public"."lifestyle_activity_level" AS ENUM('desk_job', 'active_job', 'shift_work');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('draft', 'active', 'superseded', 'archived');--> statement-breakpoint
CREATE TYPE "public"."preference_level" AS ENUM('love', 'like', 'neutral', 'avoid');--> statement-breakpoint
CREATE TYPE "public"."workout_status" AS ENUM('scheduled', 'completed', 'missed', 'modified', 'cancelled');--> statement-breakpoint
CREATE TABLE "imported_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"strava_activity_id" text NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"title" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"distance_meters" integer,
	"moving_time_minutes" integer,
	"average_heart_rate" integer,
	"perceived_effort" integer,
	"summary" jsonb,
	"imported_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reason" "adjustment_reason" NOT NULL,
	"summary" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planned_workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"title" text NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"duration_minutes" integer,
	"intensity" text,
	"rationale" text NOT NULL,
	"status" "workout_status" DEFAULT 'scheduled' NOT NULL,
	"adjustment_context" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strava_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"strava_athlete_id" text NOT NULL,
	"scope" text NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_of" timestamp with time zone NOT NULL,
	"status" "plan_status" DEFAULT 'draft' NOT NULL,
	"goal_snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_activity_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"preference_level" "preference_level" DEFAULT 'neutral' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_availability_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"part_of_day" "availability_part_of_day" DEFAULT 'custom' NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"equipment_type" "equipment_type" NOT NULL,
	"label" text NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"goal_type" "goal_type" NOT NULL,
	"activity_type" "activity_type",
	"summary" text NOT NULL,
	"details" text,
	"target_date" timestamp with time zone,
	"target_value" text,
	"unit" text,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"birth_year" integer,
	"height_cm" integer,
	"weight_kg" integer,
	"fitness_experience" "fitness_experience" DEFAULT 'beginner' NOT NULL,
	"lifestyle_activity_level" "lifestyle_activity_level" DEFAULT 'desk_job' NOT NULL,
	"average_sleep_hours" integer,
	"weekly_workout_target" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "imported_activities" ADD CONSTRAINT "imported_activities_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_adjustments" ADD CONSTRAINT "plan_adjustments_plan_id_training_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."training_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_adjustments" ADD CONSTRAINT "plan_adjustments_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_workouts" ADD CONSTRAINT "planned_workouts_plan_id_training_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."training_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_workouts" ADD CONSTRAINT "planned_workouts_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strava_connections" ADD CONSTRAINT "strava_connections_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_preferences" ADD CONSTRAINT "user_activity_preferences_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_availability_windows" ADD CONSTRAINT "user_availability_windows_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_equipment" ADD CONSTRAINT "user_equipment_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_goals" ADD CONSTRAINT "user_goals_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "imported_activities_strava_id_unique" ON "imported_activities" USING btree ("strava_activity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "strava_connections_athlete_unique" ON "strava_connections" USING btree ("strava_athlete_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_profiles_email_unique" ON "user_profiles" USING btree (lower("email"));