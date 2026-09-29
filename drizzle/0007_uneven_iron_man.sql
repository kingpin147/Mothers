ALTER TABLE "person" ALTER COLUMN "created_before_launch" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "held_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "cancellation_refund_percent" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "threshold_alert_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "godmother_code" text;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "referred_by_person_id" text;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "late_host_cancellations" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "late_host_cancelled_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_person_godmother_code" ON "person" USING btree ("godmother_code");--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_godmother_code_unique" UNIQUE("godmother_code");