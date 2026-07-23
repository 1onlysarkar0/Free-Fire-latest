ALTER TABLE "payment_email_inbox" DROP CONSTRAINT "payment_email_inbox_utr_number_unique";--> statement-breakpoint
ALTER TABLE "payment_email_inbox" DROP CONSTRAINT "payment_email_inbox_claimed_by_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "pei_utr_idx";--> statement-breakpoint
DROP INDEX "pei_claimed_idx";--> statement-breakpoint
DROP INDEX "pv_utr_verified_unique_idx";--> statement-breakpoint
ALTER TABLE "payment_email_inbox" ADD COLUMN "utr_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_email_inbox" ADD COLUMN "encrypted_data" text NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_verification" ADD COLUMN "utr_hash" text;--> statement-breakpoint
CREATE INDEX "pei_utr_hash_idx" ON "payment_email_inbox" USING btree ("utr_hash");--> statement-breakpoint
CREATE INDEX "pv_utr_hash_idx" ON "payment_verification" USING btree ("utr_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "pv_utr_verified_unique_idx" ON "payment_verification" USING btree ("utr_hash") WHERE status = 'verified';--> statement-breakpoint
ALTER TABLE "payment_config" DROP COLUMN "gmail_email";--> statement-breakpoint
ALTER TABLE "payment_config" DROP COLUMN "gmail_app_password";--> statement-breakpoint
ALTER TABLE "payment_config" DROP COLUMN "trusted_senders";--> statement-breakpoint
ALTER TABLE "payment_config" DROP COLUMN "check_days";--> statement-breakpoint
ALTER TABLE "payment_email_inbox" DROP COLUMN "utr_number";--> statement-breakpoint
ALTER TABLE "payment_email_inbox" DROP COLUMN "sender";--> statement-breakpoint
ALTER TABLE "payment_email_inbox" DROP COLUMN "is_claimed";--> statement-breakpoint
ALTER TABLE "payment_email_inbox" DROP COLUMN "claimed_by_user_id";--> statement-breakpoint
ALTER TABLE "payment_email_inbox" DROP COLUMN "claimed_at";--> statement-breakpoint
ALTER TABLE "payment_email_inbox" ADD CONSTRAINT "payment_email_inbox_utr_hash_unique" UNIQUE("utr_hash");