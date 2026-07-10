CREATE TABLE "cheater_report" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"reported_uid" text NOT NULL,
	"reported_at" timestamp NOT NULL,
	"tournament_id" text,
	"description" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"admin_note" text,
	"reviewed_by_admin_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" text PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indexing_api_config" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"google_service_account_json" text,
	"indexnow_key" text,
	"auto_submit_google" boolean DEFAULT false NOT NULL,
	"auto_submit_indexnow" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indexing_log" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"api" text NOT NULL,
	"status" text NOT NULL,
	"response" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_help_request" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"utr_number" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"admin_note" text,
	"reviewed_by_admin_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seo_config" ADD COLUMN "icon_name" text DEFAULT 'Globe';--> statement-breakpoint
ALTER TABLE "site_config" ADD COLUMN "site_url" text;--> statement-breakpoint
ALTER TABLE "site_config" ADD COLUMN "cache_version" text DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "failedVerificationCount" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "lockedUntil" timestamp;--> statement-breakpoint
ALTER TABLE "cheater_report" ADD CONSTRAINT "cheater_report_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cheater_report" ADD CONSTRAINT "cheater_report_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cheater_report" ADD CONSTRAINT "cheater_report_reviewed_by_admin_id_user_id_fk" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_help_request" ADD CONSTRAINT "payment_help_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_help_request" ADD CONSTRAINT "payment_help_request_reviewed_by_admin_id_user_id_fk" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cheater_report_user_idx" ON "cheater_report" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cheater_report_status_idx" ON "cheater_report" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cheater_report_tournament_idx" ON "cheater_report" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "cheater_report_created_idx" ON "cheater_report" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "faq_order_idx" ON "faqs" USING btree ("order");--> statement-breakpoint
CREATE INDEX "indexing_log_url_idx" ON "indexing_log" USING btree ("url");--> statement-breakpoint
CREATE INDEX "indexing_log_api_idx" ON "indexing_log" USING btree ("api");--> statement-breakpoint
CREATE INDEX "indexing_log_status_idx" ON "indexing_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "indexing_log_created_idx" ON "indexing_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payment_help_user_idx" ON "payment_help_request" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payment_help_status_idx" ON "payment_help_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_help_created_idx" ON "payment_help_request" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "custom_page" DROP COLUMN "meta_title";--> statement-breakpoint
ALTER TABLE "custom_page" DROP COLUMN "meta_description";--> statement-breakpoint
ALTER TABLE "custom_page" DROP COLUMN "meta_keywords";--> statement-breakpoint
ALTER TABLE "custom_page" DROP COLUMN "og_image";--> statement-breakpoint
ALTER TABLE "custom_page" DROP COLUMN "robots";