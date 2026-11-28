CREATE TYPE "public"."age_group_enum" AS ENUM('child', 'teen', 'adult', 'older_adult');--> statement-breakpoint
CREATE TYPE "public"."averaging_enum" AS ENUM('hourly', '8h', '24h', 'instant');--> statement-breakpoint
CREATE TYPE "public"."cooking_fuel_enum" AS ENUM('lpg', 'wood', 'electric', 'other');--> statement-breakpoint
CREATE TYPE "public"."lifestyle_enum" AS ENUM('student', 'professional', 'homemaker', 'retired', 'other');--> statement-breakpoint
CREATE TYPE "public"."plan_status_enum" AS ENUM('current', 'stale');--> statement-breakpoint
CREATE TYPE "public"."pollutant_enum" AS ENUM('pm25', 'pm10', 'no2', 'o3', 'so2', 'co', 'nh3', 'pb');--> statement-breakpoint
CREATE TYPE "public"."provider_enum" AS ENUM('cpcb', 'openaq', 'openmeteo');--> statement-breakpoint
CREATE TYPE "public"."reading_kind_enum" AS ENUM('observation', 'forecast');--> statement-breakpoint
CREATE TYPE "public"."recommendation_kind_enum" AS ENUM('daily', 'refresh');--> statement-breakpoint
CREATE TYPE "public"."report_category_enum" AS ENUM('smoke', 'dust', 'burning_waste', 'vehicle_exhaust', 'industrial', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status_enum" AS ENUM('pending', 'verified', 'not_verified', 'removed');--> statement-breakpoint
CREATE TYPE "public"."safety_flag_enum" AS ENUM('none', 'health_symptom', 'emergency');--> statement-breakpoint
CREATE TYPE "public"."setting_enum" AS ENUM('outdoor', 'indoor');--> statement-breakpoint
CREATE TYPE "public"."transport_mode_enum" AS ENUM('car', 'two_wheeler', 'auto', 'bus', 'metro', 'cycling', 'walking');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "aqi_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"station_id" uuid NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"aqi" integer,
	"category" text,
	"dominant_pollutant" text,
	"sub_indices" jsonb NOT NULL,
	"unavailable_reason" text,
	"engine_version" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"category" "report_category_enum" NOT NULL,
	"description" varchar(280) NOT NULL,
	"rounded_point" "geography" NOT NULL,
	"status" "report_status_enum" DEFAULT 'pending' NOT NULL,
	"flag_count" integer DEFAULT 0 NOT NULL,
	"moderated_by" uuid,
	"moderated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emission_factors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mode" "transport_mode_enum" NOT NULL,
	"kg_co2e_per_pkm" numeric(8, 4) NOT NULL,
	"source" text NOT NULL,
	"publication" text NOT NULL,
	"version" text NOT NULL,
	"geography" text NOT NULL,
	"occupancy_assumption" text NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"age_group" "age_group_enum" NOT NULL,
	"lifestyle" "lifestyle_enum" NOT NULL,
	"activities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gemini_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route" text NOT NULL,
	"user_id_hash" text NOT NULL,
	"model" text NOT NULL,
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"cache_hit" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indoor_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"cooking_fuel" "cooking_fuel_enum" DEFAULT 'lpg' NOT NULL,
	"incense" boolean DEFAULT false NOT NULL,
	"indoor_smoking" boolean DEFAULT false NOT NULL,
	"pets" boolean DEFAULT false NOT NULL,
	"construction_nearby" boolean DEFAULT false NOT NULL,
	"has_purifier" boolean DEFAULT false NOT NULL,
	"room_size_m2" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"city" text NOT NULL,
	"point" "geography",
	"rounded_point" "geography" NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"nearest_station_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"structured" jsonb,
	"context_snapshot" jsonb,
	"safety_flag" "safety_flag_enum" DEFAULT 'none' NOT NULL,
	"model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_prefs" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"daily_summary" boolean DEFAULT true NOT NULL,
	"category_change_alerts" boolean DEFAULT true NOT NULL,
	"plan_changed_alerts" boolean DEFAULT true NOT NULL,
	"quiet_start" text DEFAULT '22:00' NOT NULL,
	"quiet_end" text DEFAULT '07:00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"title" text NOT NULL,
	"start" timestamp with time zone NOT NULL,
	"end" timestamp with time zone NOT NULL,
	"setting" "setting_enum" NOT NULL,
	"expected_aqi" integer,
	"expected_category" text,
	"reason" text NOT NULL,
	"indoor_alternative" jsonb,
	"completed_at" timestamp with time zone,
	"user_added" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" text NOT NULL,
	"built_at" timestamp with time zone DEFAULT now() NOT NULL,
	"data_as_of" timestamp with time zone DEFAULT now() NOT NULL,
	"inputs_hash" text NOT NULL,
	"status" "plan_status_enum" DEFAULT 'current' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"lifestyle" "lifestyle_enum" DEFAULT 'professional' NOT NULL,
	"transport_modes" text[] DEFAULT '{}' NOT NULL,
	"activities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"units" text DEFAULT 'metric' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_status" (
	"provider" "provider_enum" PRIMARY KEY NOT NULL,
	"last_success_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"last_error_code" text,
	"consecutive_failures" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"station_id" uuid NOT NULL,
	"pollutant" "pollutant_enum" NOT NULL,
	"value" numeric(10, 3) NOT NULL,
	"unit" text NOT NULL,
	"averaging" "averaging_enum" NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"kind" "reading_kind_enum" NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"raw_hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"kind" "recommendation_kind_enum" NOT NULL,
	"payload" jsonb NOT NULL,
	"context_snapshot" jsonb NOT NULL,
	"data_as_of" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulator_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"inputs" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"factor_version" text NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "provider_enum" NOT NULL,
	"provider_station_id" text NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"point" "geography" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"avatar_colour" text DEFAULT '#10291a' NOT NULL,
	"email_verified" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "weather_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_key" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"kind" "reading_kind_enum" NOT NULL,
	"temp_c" numeric(5, 2) NOT NULL,
	"rh_pct" numeric(5, 2) NOT NULL,
	"wind_kph" numeric(6, 2) NOT NULL,
	"wind_dir_deg" integer NOT NULL,
	"precip_mm" numeric(6, 2) NOT NULL,
	"provider" text DEFAULT 'openmeteo' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aqi_snapshots" ADD CONSTRAINT "aqi_snapshots_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indoor_profiles" ADD CONSTRAINT "indoor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_nearest_station_id_stations_id_fk" FOREIGN KEY ("nearest_station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_prefs" ADD CONSTRAINT "notification_prefs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_activities" ADD CONSTRAINT "plan_activities_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readings" ADD CONSTRAINT "readings_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_flags" ADD CONSTRAINT "report_flags_report_id_community_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."community_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_flags" ADD CONSTRAINT "report_flags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulator_scenarios" ADD CONSTRAINT "simulator_scenarios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_conv_created_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "plans_user_date_idx" ON "plans" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "readings_unique_idx" ON "readings" USING btree ("station_id","pollutant","observed_at","kind");--> statement-breakpoint
CREATE INDEX "readings_station_observed_idx" ON "readings" USING btree ("station_id","observed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "report_flags_unique_idx" ON "report_flags" USING btree ("report_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stations_provider_station_idx" ON "stations" USING btree ("provider","provider_station_id");