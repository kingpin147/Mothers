CREATE TABLE "circle_heart" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"post_id" text,
	"reply_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circle_post" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"anonymous_area" text,
	"topic" text NOT NULL,
	"body" text NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"photo_consent" boolean DEFAULT true NOT NULL,
	"hearts_count" integer DEFAULT 0 NOT NULL,
	"replies_count" integer DEFAULT 0 NOT NULL,
	"reports_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'visible' NOT NULL,
	"is_partner_expert" boolean DEFAULT false NOT NULL,
	"hidden_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circle_reply" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"person_id" text NOT NULL,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"anonymous_area" text,
	"body" text NOT NULL,
	"is_partner_expert" boolean DEFAULT false NOT NULL,
	"hearts_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circle_report" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text,
	"reply_id" text,
	"reporter_person_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by_admin_id" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_batch" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"amount" integer NOT NULL,
	"remaining" integer NOT NULL,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"source" text DEFAULT 'purchase' NOT NULL,
	"stripe_payment_intent_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "host_request" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text,
	"person_id" text NOT NULL,
	"format" text,
	"neighbourhood" text,
	"preferred_days" text,
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reason" text,
	"charter_agreed" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"credits_awarded" integer DEFAULT 0 NOT NULL,
	"reviewed_by_admin_id" text,
	"reviewed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"source" text DEFAULT 'countdown_banner' NOT NULL,
	"type" text DEFAULT 'waitlist' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "faq_item" ALTER COLUMN "question_es" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "faq_item" ALTER COLUMN "answer_es" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "journal_post" ALTER COLUMN "author" SET DEFAULT 'The Mothers';--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "member_credits" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "non_member_credits" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "needs_host" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "host_person_id" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "is_ran" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "ran_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "cancellation_window_hours" integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "non_member_opens_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "faq_item" ADD COLUMN "group_name" text DEFAULT 'Coming to an event now' NOT NULL;--> statement-breakpoint
ALTER TABLE "faq_item" ADD COLUMN "policy_quote" text;--> statement-breakpoint
ALTER TABLE "faq_item" ADD COLUMN "is_published" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "journal_post" ADD COLUMN "title_es" text;--> statement-breakpoint
ALTER TABLE "journal_post" ADD COLUMN "category" text DEFAULT 'postpartum' NOT NULL;--> statement-breakpoint
ALTER TABLE "journal_post" ADD COLUMN "excerpt_es" text;--> statement-breakpoint
ALTER TABLE "journal_post" ADD COLUMN "body_es" text;--> statement-breakpoint
ALTER TABLE "journal_post" ADD COLUMN "quote_en" text;--> statement-breakpoint
ALTER TABLE "journal_post" ADD COLUMN "quote_es" text;--> statement-breakpoint
ALTER TABLE "journal_post" ADD COLUMN "author_role_en" text;--> statement-breakpoint
ALTER TABLE "journal_post" ADD COLUMN "author_role_es" text;--> statement-breakpoint
ALTER TABLE "journal_post" ADD COLUMN "byline_en" text;--> statement-breakpoint
ALTER TABLE "journal_post" ADD COLUMN "byline_es" text;--> statement-breakpoint
ALTER TABLE "journal_post" ADD COLUMN "reviewed_note_en" text;--> statement-breakpoint
ALTER TABLE "journal_post" ADD COLUMN "reviewed_note_es" text;--> statement-breakpoint
ALTER TABLE "journal_post" ADD COLUMN "seo_title_es" text;--> statement-breakpoint
ALTER TABLE "journal_post" ADD COLUMN "seo_description_es" text;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "created_before_launch" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "is_paused" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "paused_reason" text;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "is_suspended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "suspended_reason" text;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "profile_done" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "person" ADD COLUMN "profile_data" jsonb;--> statement-breakpoint
ALTER TABLE "circle_heart" ADD CONSTRAINT "circle_heart_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_heart" ADD CONSTRAINT "circle_heart_post_id_circle_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."circle_post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_heart" ADD CONSTRAINT "circle_heart_reply_id_circle_reply_id_fk" FOREIGN KEY ("reply_id") REFERENCES "public"."circle_reply"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_post" ADD CONSTRAINT "circle_post_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_reply" ADD CONSTRAINT "circle_reply_post_id_circle_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."circle_post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_reply" ADD CONSTRAINT "circle_reply_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_report" ADD CONSTRAINT "circle_report_post_id_circle_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."circle_post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_report" ADD CONSTRAINT "circle_report_reply_id_circle_reply_id_fk" FOREIGN KEY ("reply_id") REFERENCES "public"."circle_reply"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_report" ADD CONSTRAINT "circle_report_reporter_person_id_person_id_fk" FOREIGN KEY ("reporter_person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_report" ADD CONSTRAINT "circle_report_reviewed_by_admin_id_admin_user_id_fk" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "public"."admin_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_batch" ADD CONSTRAINT "credit_batch_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "host_request" ADD CONSTRAINT "host_request_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "host_request" ADD CONSTRAINT "host_request_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "host_request" ADD CONSTRAINT "host_request_reviewed_by_admin_id_admin_user_id_fk" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "public"."admin_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_person_post_heart" ON "circle_heart" USING btree ("person_id","post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_person_reply_heart" ON "circle_heart" USING btree ("person_id","reply_id");--> statement-breakpoint
CREATE INDEX "idx_circle_post_topic_created" ON "circle_post" USING btree ("topic","created_at");--> statement-breakpoint
CREATE INDEX "idx_circle_post_status_created" ON "circle_post" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_circle_post_person" ON "circle_post" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "idx_circle_reply_post_created" ON "circle_reply" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_circle_report_post" ON "circle_report" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_circle_report_status" ON "circle_report" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_credit_batch_person_expires" ON "credit_batch" USING btree ("person_id","expires_at");--> statement-breakpoint
CREATE INDEX "idx_host_request_event" ON "host_request" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_host_request_person" ON "host_request" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "idx_lead_entry_email" ON "lead_entry" USING btree ("email");--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_host_person_id_person_id_fk" FOREIGN KEY ("host_person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;