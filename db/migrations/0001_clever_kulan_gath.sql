CREATE TABLE IF NOT EXISTS "payment_email_inbox" (
	"id" text PRIMARY KEY NOT NULL,
	"utr_hash" text NOT NULL,
	"amount" integer NOT NULL,
	"encrypted_data" text NOT NULL,
	"email_message_id" text,
	"is_claimed" boolean DEFAULT false NOT NULL,
	"claimed_by_user_id" text,
	"claimed_at" timestamp,
	"received_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_email_inbox_utr_hash_unique" UNIQUE("utr_hash")
);
--> statement-breakpoint
ALTER TABLE "payment_email_inbox" DROP CONSTRAINT IF EXISTS "payment_email_inbox_claimed_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "payment_email_inbox" ADD CONSTRAINT "payment_email_inbox_claimed_by_user_id_user_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pei_utr_hash_idx" ON "payment_email_inbox" USING btree ("utr_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pei_claimed_idx" ON "payment_email_inbox" USING btree ("is_claimed");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pei_received_idx" ON "payment_email_inbox" USING btree ("received_at");