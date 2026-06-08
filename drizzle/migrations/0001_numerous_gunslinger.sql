ALTER TABLE "strava_connections" ADD COLUMN "athlete_username" text;--> statement-breakpoint
ALTER TABLE "strava_connections" ADD COLUMN "athlete_first_name" text;--> statement-breakpoint
ALTER TABLE "strava_connections" ADD COLUMN "athlete_last_name" text;--> statement-breakpoint
ALTER TABLE "strava_connections" ADD COLUMN "access_token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "strava_connections" ADD COLUMN "refresh_token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "strava_connections" ADD COLUMN "token_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "strava_connections" ADD COLUMN "expires_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "strava_connections" ADD COLUMN "redirect_uri" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "strava_connections_user_unique" ON "strava_connections" USING btree ("user_id");