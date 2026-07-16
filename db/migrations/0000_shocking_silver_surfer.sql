CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_role" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permissions" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_role_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "admin_user_role" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role_id" text NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_page_content" (
	"id" text PRIMARY KEY NOT NULL,
	"quote" text NOT NULL,
	"subtext" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cancellation_refunds" (
	"id" text PRIMARY KEY NOT NULL,
	"cancellation_id" text NOT NULL,
	"user_id" text NOT NULL,
	"refund_amount" integer DEFAULT 0 NOT NULL,
	"refund_transaction_id" text,
	"status" text DEFAULT 'PENDING' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbot_config" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"chatbot_name" text DEFAULT 'Nemu' NOT NULL,
	"welcome_message" text DEFAULT 'Hi there! I''m Nemu, your support assistant for 1onlysarkar. I can help you with tournaments, wallet, account settings, and more. How can I help you today?' NOT NULL,
	"description" text DEFAULT '1onlysarkar''s official AI support assistant — tournament registration, wallet & payment help, account setup, and platform navigation.' NOT NULL,
	"ai_provider" text DEFAULT 'gemini' NOT NULL,
	"api_key" text DEFAULT '' NOT NULL,
	"custom_endpoint" text,
	"model" text DEFAULT 'gemini-2.0-flash-exp' NOT NULL,
	"temperature" text DEFAULT '0.7' NOT NULL,
	"max_response_tokens" integer DEFAULT 500 NOT NULL,
	"context_window" integer DEFAULT 10 NOT NULL,
	"system_prompt" text DEFAULT '' NOT NULL,
	"streaming_enabled" boolean DEFAULT true NOT NULL,
	"rate_limit_enabled" boolean DEFAULT true NOT NULL,
	"rate_limit_per_hour" integer DEFAULT 30 NOT NULL,
	"allow_anonymous" boolean DEFAULT false NOT NULL,
	"input_placeholder" text DEFAULT 'Type your question here... (max 300 words)' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbot_knowledge" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"category" text DEFAULT 'General' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbot_message" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"status" text DEFAULT 'success' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbot_session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"session_token" text NOT NULL,
	"user_name" text,
	"ip_address" text,
	"user_agent" text,
	"message_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"last_page_context" text,
	CONSTRAINT "chatbot_session_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
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
CREATE TABLE "content_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"content_html" text DEFAULT '' NOT NULL,
	"content_markdown" text DEFAULT '' NOT NULL,
	"created_by_admin_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_page" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "custom_page_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "email_template" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"preview_text" text,
	"body_html" text NOT NULL,
	"design_json" text,
	"template_key" text,
	"variables" text,
	"variables_schema" text,
	"description" text,
	"category" text DEFAULT 'system' NOT NULL,
	"editor_type" text DEFAULT 'html' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_template_name_unique" UNIQUE("name")
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
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"total_invites" integer DEFAULT 0 NOT NULL,
	"total_earned" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitation_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "invitation_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "invitation_config" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"inviter_bonus" integer DEFAULT 50 NOT NULL,
	"invitee_bonus" integer DEFAULT 25 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation_use" (
	"id" text PRIMARY KEY NOT NULL,
	"invitation_id" text NOT NULL,
	"inviter_user_id" text NOT NULL,
	"invitee_user_id" text NOT NULL,
	"signup_method" text DEFAULT 'email' NOT NULL,
	"inviter_bonus_amount" integer DEFAULT 0 NOT NULL,
	"invitee_bonus_amount" integer DEFAULT 0 NOT NULL,
	"inviter_transaction_id" text,
	"invitee_transaction_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitation_use_invitee_user_id_unique" UNIQUE("invitee_user_id")
);
--> statement-breakpoint
CREATE TABLE "navigation_item" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"url" text DEFAULT '#' NOT NULL,
	"description" text,
	"icon" text,
	"parent_id" text,
	"order" integer DEFAULT 0 NOT NULL,
	"is_mobile_extra" boolean DEFAULT false NOT NULL,
	"is_footer" boolean DEFAULT false NOT NULL,
	"is_social" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text NOT NULL,
	"reference_id" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_config" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"gmail_email" text DEFAULT '' NOT NULL,
	"gmail_app_password" text DEFAULT '' NOT NULL,
	"trusted_senders" text DEFAULT '[]' NOT NULL,
	"check_days" integer DEFAULT 1 NOT NULL,
	"upi_id" text DEFAULT '' NOT NULL,
	"upi_name" text DEFAULT '1onlysarkar' NOT NULL,
	"page_content" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "payment_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"claimed_amount" integer NOT NULL,
	"verified_amount" integer,
	"utr_number" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"email_message_id" text,
	"email_sender" text,
	"ip_address" text,
	"fail_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"verified_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "robots_config" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"page_id" text NOT NULL,
	"score" integer NOT NULL,
	"grade" text NOT NULL,
	"checks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"critical_issues" jsonb DEFAULT '[]'::jsonb,
	"warnings" jsonb DEFAULT '[]'::jsonb,
	"suggestions" jsonb DEFAULT '[]'::jsonb,
	"checked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_config" (
	"id" text PRIMARY KEY NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"meta_keywords" text,
	"og_title" text,
	"og_description" text,
	"og_image" text,
	"og_type" text DEFAULT 'website',
	"twitter_card" text DEFAULT 'summary_large_image',
	"twitter_site" text,
	"twitter_title" text,
	"twitter_description" text,
	"twitter_image" text,
	"canonical_url" text,
	"robots" text DEFAULT 'index, follow',
	"structured_data_json" text,
	"schema_type" text DEFAULT 'WebPage',
	"schema_data" jsonb,
	"og_image_dynamic" boolean DEFAULT false,
	"og_image_template" text,
	"icon_name" text DEFAULT 'Globe',
	"seo_score" integer,
	"last_audited" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "site_config" (
	"id" text PRIMARY KEY NOT NULL,
	"deleted_tournaments_count" integer DEFAULT 0 NOT NULL,
	"site_url" text,
	"logo_url" text DEFAULT '/' NOT NULL,
	"logo_src" text DEFAULT '/assets/logo.svg' NOT NULL,
	"logo_alt" text DEFAULT 'logo' NOT NULL,
	"logo_title" text DEFAULT '1onlysarkar' NOT NULL,
	"auth_login_text" text DEFAULT 'Log in' NOT NULL,
	"auth_login_url" text DEFAULT '/sign-in' NOT NULL,
	"auth_signup_text" text DEFAULT 'Create account' NOT NULL,
	"auth_signup_url" text DEFAULT '/sign-up' NOT NULL,
	"auth_panel_image_url" text,
	"auth_panel_color" text DEFAULT '#FF5A1F',
	"copyright_text" text,
	"hero_headline" text,
	"hero_subheadline" text,
	"hero_cta_primary_text" text,
	"hero_cta_primary_url" text,
	"hero_cta_secondary_text" text,
	"hero_cta_secondary_url" text,
	"hero_badge_text" text,
	"hero_badge_url" text,
	"navbar_dashboard_text" text DEFAULT 'Dashboard',
	"user_profile_my_account_text" text DEFAULT 'My Account',
	"user_profile_log_out_text" text DEFAULT 'Log out',
	"contact_email" text,
	"company_address" text,
	"jurisdiction_name" text,
	"admin_slug" text DEFAULT 'admin',
	"cache_version" text DEFAULT '1' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smtp_config" (
	"id" text PRIMARY KEY NOT NULL,
	"host" text NOT NULL,
	"port" integer DEFAULT 587 NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"from_name" text NOT NULL,
	"from_email" text NOT NULL,
	"secure" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smtp_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"provider_type" text DEFAULT 'gmail_smtp' NOT NULL,
	"host" text NOT NULL,
	"port" integer DEFAULT 587 NOT NULL,
	"secure" boolean DEFAULT false NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"from_name" text NOT NULL,
	"from_email" text NOT NULL,
	"reply_to" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'FREE' NOT NULL,
	"joining_fee" integer DEFAULT 0 NOT NULL,
	"prize_pool" integer DEFAULT 0 NOT NULL,
	"game_mode" text NOT NULL,
	"team_format" text NOT NULL,
	"maps" text DEFAULT '[]' NOT NULL,
	"total_slots" integer DEFAULT 12 NOT NULL,
	"start_time" timestamp NOT NULL,
	"registration_deadline" timestamp NOT NULL,
	"end_time" timestamp,
	"description_html" text,
	"description_markdown" text,
	"rules_html" text,
	"rules_markdown" text,
	"status" text DEFAULT 'UPCOMING' NOT NULL,
	"room_id" text,
	"room_password" text,
	"created_by_admin_id" text,
	"seo_config_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_cancellations" (
	"id" text PRIMARY KEY NOT NULL,
	"tournament_id" text NOT NULL,
	"reason" text NOT NULL,
	"cancelled_by_admin_id" text,
	"cancelled_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"tournament_id" text NOT NULL,
	"user_id" text NOT NULL,
	"slot_id" text NOT NULL,
	"entry_fee_paid" integer DEFAULT 0 NOT NULL,
	"join_transaction_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"tournament_id" text NOT NULL,
	"slot_number" integer NOT NULL,
	"status" text DEFAULT 'AVAILABLE' NOT NULL,
	"user_id" text,
	"team_name" text,
	"ign_list" text DEFAULT '[]' NOT NULL,
	"booked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tournament_winners" (
	"id" text PRIMARY KEY NOT NULL,
	"tournament_id" text NOT NULL,
	"user_id" text NOT NULL,
	"slot_id" text,
	"placement" text DEFAULT '1st' NOT NULL,
	"prize_amount" integer DEFAULT 0 NOT NULL,
	"credit_transaction_id" text,
	"declared_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "twoFactor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backupCodes" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"userId" text NOT NULL,
	"failedVerificationCount" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"gameName" text,
	"uid" text,
	"twoFactorEnabled" boolean DEFAULT false,
	"failedVerificationCount" integer DEFAULT 0,
	"lockedUntil" timestamp,
	"top_player" boolean DEFAULT false,
	"is_admin" boolean DEFAULT false NOT NULL,
	"is_banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"balance_before" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reference_id" text,
	"description" text,
	"status" text DEFAULT 'COMPLETED' NOT NULL,
	"idempotency_key" text,
	"performed_by_admin_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_transactions_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "withdraw_config" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"min_withdraw_amount" integer DEFAULT 50 NOT NULL,
	"daily_withdraw_limit" integer DEFAULT 3 NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "withdraw_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"upi_id" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"admin_note" text,
	"refunded_on_cancel" boolean DEFAULT false NOT NULL,
	"transaction_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"processed_by_admin_id" text
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_user_role" ADD CONSTRAINT "admin_user_role_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_user_role" ADD CONSTRAINT "admin_user_role_role_id_admin_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."admin_role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cancellation_refunds" ADD CONSTRAINT "cancellation_refunds_cancellation_id_tournament_cancellations_id_fk" FOREIGN KEY ("cancellation_id") REFERENCES "public"."tournament_cancellations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cancellation_refunds" ADD CONSTRAINT "cancellation_refunds_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_message" ADD CONSTRAINT "chatbot_message_session_id_chatbot_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chatbot_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_session" ADD CONSTRAINT "chatbot_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cheater_report" ADD CONSTRAINT "cheater_report_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cheater_report" ADD CONSTRAINT "cheater_report_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cheater_report" ADD CONSTRAINT "cheater_report_reviewed_by_admin_id_user_id_fk" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_templates" ADD CONSTRAINT "content_templates_created_by_admin_id_user_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_use" ADD CONSTRAINT "invitation_use_invitation_id_invitation_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_use" ADD CONSTRAINT "invitation_use_inviter_user_id_user_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_use" ADD CONSTRAINT "invitation_use_invitee_user_id_user_id_fk" FOREIGN KEY ("invitee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_help_request" ADD CONSTRAINT "payment_help_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_help_request" ADD CONSTRAINT "payment_help_request_reviewed_by_admin_id_user_id_fk" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_verification" ADD CONSTRAINT "payment_verification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_created_by_admin_id_user_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_cancellations" ADD CONSTRAINT "tournament_cancellations_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_cancellations" ADD CONSTRAINT "tournament_cancellations_cancelled_by_admin_id_user_id_fk" FOREIGN KEY ("cancelled_by_admin_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_slot_id_tournament_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."tournament_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_slots" ADD CONSTRAINT "tournament_slots_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_slots" ADD CONSTRAINT "tournament_slots_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_winners" ADD CONSTRAINT "tournament_winners_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_winners" ADD CONSTRAINT "tournament_winners_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_winners" ADD CONSTRAINT "tournament_winners_slot_id_tournament_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."tournament_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "twoFactor" ADD CONSTRAINT "twoFactor_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_performed_by_admin_id_user_id_fk" FOREIGN KEY ("performed_by_admin_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdraw_requests" ADD CONSTRAINT "withdraw_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdraw_requests" ADD CONSTRAINT "withdraw_requests_processed_by_admin_id_user_id_fk" FOREIGN KEY ("processed_by_admin_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "admin_user_role_user_idx" ON "admin_user_role" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "admin_user_role_role_idx" ON "admin_user_role" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "refund_cancellation_idx" ON "cancellation_refunds" USING btree ("cancellation_id");--> statement-breakpoint
CREATE INDEX "refund_user_idx" ON "cancellation_refunds" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chatbot_message_session_idx" ON "chatbot_message" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "chatbot_session_user_idx" ON "chatbot_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chatbot_session_token_idx" ON "chatbot_session" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "cheater_report_user_idx" ON "cheater_report" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cheater_report_status_idx" ON "cheater_report" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cheater_report_tournament_idx" ON "cheater_report" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "cheater_report_created_idx" ON "cheater_report" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "content_template_type_idx" ON "content_templates" USING btree ("type");--> statement-breakpoint
CREATE INDEX "custom_page_status_idx" ON "custom_page" USING btree ("status");--> statement-breakpoint
CREATE INDEX "faq_order_idx" ON "faqs" USING btree ("order");--> statement-breakpoint
CREATE INDEX "indexing_log_url_idx" ON "indexing_log" USING btree ("url");--> statement-breakpoint
CREATE INDEX "indexing_log_api_idx" ON "indexing_log" USING btree ("api");--> statement-breakpoint
CREATE INDEX "indexing_log_status_idx" ON "indexing_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "indexing_log_created_idx" ON "indexing_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "invitation_user_idx" ON "invitation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invitation_code_idx" ON "invitation" USING btree ("code");--> statement-breakpoint
CREATE INDEX "invitation_active_idx" ON "invitation" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "inv_use_invitation_idx" ON "invitation_use" USING btree ("invitation_id");--> statement-breakpoint
CREATE INDEX "inv_use_inviter_idx" ON "invitation_use" USING btree ("inviter_user_id");--> statement-breakpoint
CREATE INDEX "inv_use_invitee_idx" ON "invitation_use" USING btree ("invitee_user_id");--> statement-breakpoint
CREATE INDEX "inv_use_created_idx" ON "invitation_use" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "nav_item_footer_idx" ON "navigation_item" USING btree ("is_footer");--> statement-breakpoint
CREATE INDEX "nav_item_social_idx" ON "navigation_item" USING btree ("is_social");--> statement-breakpoint
CREATE INDEX "nav_item_order_idx" ON "navigation_item" USING btree ("order");--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "notification_created_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payment_help_user_idx" ON "payment_help_request" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payment_help_status_idx" ON "payment_help_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_help_created_idx" ON "payment_help_request" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pv_user_created_idx" ON "payment_verification" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "pv_utr_idx" ON "payment_verification" USING btree ("utr_number");--> statement-breakpoint
CREATE UNIQUE INDEX "pv_utr_verified_unique_idx" ON "payment_verification" USING btree ("utr_number") WHERE status = 'verified';--> statement-breakpoint
CREATE INDEX "pv_status_idx" ON "payment_verification" USING btree ("status");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "tournament_status_idx" ON "tournaments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tournament_start_time_idx" ON "tournaments" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "tournament_type_idx" ON "tournaments" USING btree ("type");--> statement-breakpoint
CREATE INDEX "tournament_game_mode_idx" ON "tournaments" USING btree ("game_mode");--> statement-breakpoint
CREATE INDEX "cancellation_tournament_idx" ON "tournament_cancellations" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "participant_tournament_idx" ON "tournament_participants" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "participant_user_idx" ON "tournament_participants" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participant_tournament_user_unique_idx" ON "tournament_participants" USING btree ("tournament_id","user_id");--> statement-breakpoint
CREATE INDEX "slot_tournament_idx" ON "tournament_slots" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "slot_user_idx" ON "tournament_slots" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "slot_status_idx" ON "tournament_slots" USING btree ("status");--> statement-breakpoint
CREATE INDEX "winner_tournament_idx" ON "tournament_winners" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "winner_user_idx" ON "tournament_winners" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "winner_tournament_user_unique_idx" ON "tournament_winners" USING btree ("tournament_id","user_id");--> statement-breakpoint
CREATE INDEX "two_factor_user_id_idx" ON "twoFactor" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "user_top_player_idx" ON "user" USING btree ("top_player");--> statement-breakpoint
CREATE INDEX "user_is_admin_idx" ON "user" USING btree ("is_admin");--> statement-breakpoint
CREATE INDEX "user_is_banned_idx" ON "user" USING btree ("is_banned");--> statement-breakpoint
CREATE INDEX "wallet_user_idx" ON "wallets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "txn_user_idx" ON "wallet_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "txn_type_idx" ON "wallet_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "txn_reference_idx" ON "wallet_transactions" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "txn_created_at_idx" ON "wallet_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "withdraw_user_idx" ON "withdraw_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "withdraw_status_idx" ON "withdraw_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "withdraw_created_at_idx" ON "withdraw_requests" USING btree ("created_at");