ALTER TYPE "public"."credit_entry_type" ADD VALUE 'purchase' BEFORE 'spend';--> statement-breakpoint
ALTER TYPE "public"."credit_entry_type" ADD VALUE 'referral' BEFORE 'spend';--> statement-breakpoint
ALTER TYPE "public"."credit_entry_type" ADD VALUE 'godmother';--> statement-breakpoint
ALTER TYPE "public"."credit_entry_type" ADD VALUE 'godmother_bonus';--> statement-breakpoint
ALTER TYPE "public"."credit_entry_type" ADD VALUE 'subscription_grant';--> statement-breakpoint
ALTER TYPE "public"."credit_entry_type" ADD VALUE 'rollover';--> statement-breakpoint
ALTER TYPE "public"."credit_entry_type" ADD VALUE 'event_booking';--> statement-breakpoint
ALTER TYPE "public"."credit_entry_type" ADD VALUE 'event_refund';--> statement-breakpoint
ALTER TYPE "public"."credit_entry_type" ADD VALUE 'expiration';--> statement-breakpoint
ALTER TYPE "public"."credit_entry_type" ADD VALUE 'admin_adjustment';--> statement-breakpoint
CREATE TABLE "event_stage" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"stage_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label_en" text NOT NULL,
	"label_es" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"age_from_months" integer,
	"age_to_months" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stage_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "window" ALTER COLUMN "joining_fee_cents" SET DEFAULT 1900;--> statement-breakpoint
ALTER TABLE "window" ALTER COLUMN "launch_rate" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "pending_return_credits" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "pending_return_state" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "capacity_guest_gathering" integer;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "show_event_pass_cta" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "childcare" text DEFAULT 'child_inclusive' NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "languages" text[];--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "tier" text DEFAULT 'circle' NOT NULL;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "billing_frequency" text DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "price_cents" integer DEFAULT 3900 NOT NULL;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "pause_months_used_year" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "no_show_count_90d" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "rsvp_suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "referred_by_member_id" text;--> statement-breakpoint
ALTER TABLE "partner" ADD COLUMN "discount_code" text;--> statement-breakpoint
ALTER TABLE "window" ADD COLUMN "tier_prices" jsonb;--> statement-breakpoint
ALTER TABLE "event_stage" ADD CONSTRAINT "event_stage_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_stage" ADD CONSTRAINT "event_stage_stage_id_stage_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stage"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_event_stage" ON "event_stage" USING btree ("event_id","stage_id");