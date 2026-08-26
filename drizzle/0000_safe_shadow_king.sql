CREATE TYPE "public"."admin_role" AS ENUM('owner', 'manager', 'host', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('submitted', 'accepted', 'paid', 'expired', 'declined', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."booking_kind" AS ENUM('member', 'guest', 'rsvp');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('held', 'confirmed', 'released', 'cancelled_event', 'attended', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."credit_entry_type" AS ENUM('grant', 'joining_bonus', 'spend', 'return_release', 'return_cancellation', 'expiry', 'adjustment', 'correction');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'published_pending', 'confirmed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."godmother_status" AS ENUM('pending', 'qualified', 'paid');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('applicant', 'accepted_awaiting_payment', 'active', 'past_due', 'paused', 'cancelled_at_period_end', 'lapsed', 'banned');--> statement-breakpoint
CREATE TYPE "public"."pass_status" AS ENUM('paid', 'used', 'released', 'refunded', 'credited');--> statement-breakpoint
CREATE TYPE "public"."window_status" AS ENUM('draft', 'open', 'closed');--> statement-breakpoint
CREATE TABLE "admin_user" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" "admin_role" NOT NULL,
	"password_hash" text NOT NULL,
	"mfa_enrolled_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "application" (
	"id" text PRIMARY KEY NOT NULL,
	"window_id" text NOT NULL,
	"person_id" text NOT NULL,
	"answers" jsonb NOT NULL,
	"form_version_id" text,
	"status" "application_status" DEFAULT 'submitted' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by_admin_id" text,
	"decline_reason_code" text,
	"decline_note" text,
	"accept_expires_at" timestamp with time zone,
	"payment_link_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_form_version" (
	"id" text PRIMARY KEY NOT NULL,
	"version" integer NOT NULL,
	"questions" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor_type" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"ip" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"person_id" text NOT NULL,
	"member_id" text,
	"kind" "booking_kind" NOT NULL,
	"status" "booking_status" DEFAULT 'held' NOT NULL,
	"credits_charged" integer DEFAULT 0 NOT NULL,
	"money_paid_cents" integer DEFAULT 0 NOT NULL,
	"pass_id" text,
	"booked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"attended_at" timestamp with time zone,
	"no_show" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_record" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"purpose" text NOT NULL,
	"granted" boolean NOT NULL,
	"text_shown_verbatim" text NOT NULL,
	"version" text NOT NULL,
	"ip" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_allocation" (
	"id" text PRIMARY KEY NOT NULL,
	"spend_entry_id" text NOT NULL,
	"grant_entry_id" text NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"amount" integer NOT NULL,
	"type" "credit_entry_type" NOT NULL,
	"expires_at" timestamp with time zone,
	"source_type" text NOT NULL,
	"source_id" text,
	"reason" text,
	"actor_admin_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_log" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"template_key" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"provider_id" text,
	"error" text,
	"sent_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_log_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "error_log" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"message" text NOT NULL,
	"stack_trace" text,
	"context" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"category_id" text,
	"description" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"venue_name" text NOT NULL,
	"meeting_point" text NOT NULL,
	"neighbourhood" text NOT NULL,
	"capacity_member" integer NOT NULL,
	"capacity_guest" integer DEFAULT 2 NOT NULL,
	"min_to_confirm" integer DEFAULT 0 NOT NULL,
	"credit_cost" integer NOT NULL,
	"guest_price_cents" integer DEFAULT 3500 NOT NULL,
	"is_signature" boolean DEFAULT false NOT NULL,
	"is_free_walk" boolean DEFAULT false NOT NULL,
	"partner_id" text,
	"host_admin_id" text,
	"image_id" text,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"guest_open_at" timestamp with time zone,
	"guest_close_at" timestamp with time zone,
	"decision_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "event_category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"stage_affinity" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "event_change_log" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"changed_by_admin_id" text,
	"field_name" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_pass" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"event_id" text NOT NULL,
	"price_cents" integer DEFAULT 3500 NOT NULL,
	"status" "pass_status" DEFAULT 'paid' NOT NULL,
	"ticket_token_hash" text NOT NULL,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"credit_applied_to_member_id" text,
	"credit_expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_pass_ticket_token_hash_unique" UNIQUE("ticket_token_hash")
);
--> statement-breakpoint
CREATE TABLE "event_waitlist" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"person_id" text NOT NULL,
	"position" integer NOT NULL,
	"offered_at" timestamp with time zone,
	"offer_expires_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faq_item" (
	"id" text PRIMARY KEY NOT NULL,
	"question_en" text NOT NULL,
	"answer_en" text NOT NULL,
	"question_es" text NOT NULL,
	"answer_es" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "godmother_referral" (
	"id" text PRIMARY KEY NOT NULL,
	"referrer_member_id" text NOT NULL,
	"referred_person_id" text NOT NULL,
	"code" text NOT NULL,
	"status" "godmother_status" DEFAULT 'pending' NOT NULL,
	"qualified_at" timestamp with time zone,
	"payout_credit_entry_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "godmother_referral_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "guest_rsvp" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"whatsapp_e164" text,
	"attended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_run" (
	"id" text PRIMARY KEY NOT NULL,
	"job_key" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"outcome" text NOT NULL,
	"counts" jsonb,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "journal_post" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text NOT NULL,
	"body" text NOT NULL,
	"author" text NOT NULL,
	"hero_image_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"seo_title" text,
	"seo_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "journal_post_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "media_asset" (
	"id" text PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"alt_text" text NOT NULL,
	"bucket_path" text NOT NULL,
	"public_url" text NOT NULL,
	"uploaded_by_admin_id" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"status" "member_status" DEFAULT 'applicant' NOT NULL,
	"stage" text,
	"neighbourhood" text,
	"children" jsonb DEFAULT '[]'::jsonb,
	"joined_at" timestamp with time zone,
	"monthly_price_cents" integer DEFAULT 3900 NOT NULL,
	"price_locked_until" timestamp with time zone,
	"joining_fee_paid_cents" integer DEFAULT 0 NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"paused_until" timestamp with time zone,
	"at_risk_since" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_person_id_unique" UNIQUE("person_id")
);
--> statement-breakpoint
CREATE TABLE "member_credential" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"password_hash" text NOT NULL,
	"password_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reset_token_hash" text,
	"reset_token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_credential_person_id_unique" UNIQUE("person_id")
);
--> statement-breakpoint
CREATE TABLE "page_content" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by_admin_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"umbrella" text NOT NULL,
	"specialty" text NOT NULL,
	"description" text NOT NULL,
	"offer_for_members" text NOT NULL,
	"links" jsonb DEFAULT '{}'::jsonb,
	"logo_image_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"exclusive_from" timestamp with time zone,
	"exclusive_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"purpose" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"status" text NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_invoice_id" text,
	"refunded_cents" integer DEFAULT 0 NOT NULL,
	"failure_code" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id")
);
--> statement-breakpoint
CREATE TABLE "person" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone_e164" text,
	"whatsapp_e164" text,
	"locale" text DEFAULT 'es' NOT NULL,
	"is_mother" boolean DEFAULT true NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"source" text,
	"notes_internal" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "person_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "setting" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_event" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stage_at_signup" text,
	"source" text,
	"removed_at" timestamp with time zone,
	"removed_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "window" (
	"id" text PRIMARY KEY NOT NULL,
	"opens_at" timestamp with time zone NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"places_offered" integer NOT NULL,
	"joining_fee_cents" integer DEFAULT 5800 NOT NULL,
	"monthly_price_cents" integer DEFAULT 3900 NOT NULL,
	"launch_rate" boolean DEFAULT false NOT NULL,
	"lock_months" integer DEFAULT 12 NOT NULL,
	"status" "window_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_window_id_window_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."window"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_form_version_id_application_form_version_id_fk" FOREIGN KEY ("form_version_id") REFERENCES "public"."application_form_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_decided_by_admin_id_admin_user_id_fk" FOREIGN KEY ("decided_by_admin_id") REFERENCES "public"."admin_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_record" ADD CONSTRAINT "consent_record_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_allocation" ADD CONSTRAINT "credit_allocation_spend_entry_id_credit_entry_id_fk" FOREIGN KEY ("spend_entry_id") REFERENCES "public"."credit_entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_allocation" ADD CONSTRAINT "credit_allocation_grant_entry_id_credit_entry_id_fk" FOREIGN KEY ("grant_entry_id") REFERENCES "public"."credit_entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_entry" ADD CONSTRAINT "credit_entry_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_entry" ADD CONSTRAINT "credit_entry_actor_admin_id_admin_user_id_fk" FOREIGN KEY ("actor_admin_id") REFERENCES "public"."admin_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_category_id_event_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."event_category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_host_admin_id_admin_user_id_fk" FOREIGN KEY ("host_admin_id") REFERENCES "public"."admin_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_change_log" ADD CONSTRAINT "event_change_log_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_change_log" ADD CONSTRAINT "event_change_log_changed_by_admin_id_admin_user_id_fk" FOREIGN KEY ("changed_by_admin_id") REFERENCES "public"."admin_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_pass" ADD CONSTRAINT "event_pass_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_pass" ADD CONSTRAINT "event_pass_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_pass" ADD CONSTRAINT "event_pass_credit_applied_to_member_id_member_id_fk" FOREIGN KEY ("credit_applied_to_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_waitlist" ADD CONSTRAINT "event_waitlist_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_waitlist" ADD CONSTRAINT "event_waitlist_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "godmother_referral" ADD CONSTRAINT "godmother_referral_referrer_member_id_member_id_fk" FOREIGN KEY ("referrer_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "godmother_referral" ADD CONSTRAINT "godmother_referral_referred_person_id_person_id_fk" FOREIGN KEY ("referred_person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "godmother_referral" ADD CONSTRAINT "godmother_referral_payout_credit_entry_id_credit_entry_id_fk" FOREIGN KEY ("payout_credit_entry_id") REFERENCES "public"."credit_entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_rsvp" ADD CONSTRAINT "guest_rsvp_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_uploaded_by_admin_id_admin_user_id_fk" FOREIGN KEY ("uploaded_by_admin_id") REFERENCES "public"."admin_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_credential" ADD CONSTRAINT "member_credential_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_content" ADD CONSTRAINT "page_content_updated_by_admin_id_admin_user_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."admin_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entry" ADD CONSTRAINT "waitlist_entry_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_application_window_status" ON "application" USING btree ("window_id","status");--> statement-breakpoint
CREATE INDEX "idx_booking_event_status" ON "booking" USING btree ("event_id","status");--> statement-breakpoint
CREATE INDEX "idx_booking_person_status" ON "booking" USING btree ("person_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_active_booking" ON "booking" USING btree ("event_id","person_id") WHERE status IN ('held', 'confirmed');--> statement-breakpoint
CREATE INDEX "idx_credit_entry_member_created" ON "credit_entry" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_credit_entry_member_expires" ON "credit_entry" USING btree ("member_id","expires_at") WHERE type = 'grant';--> statement-breakpoint
CREATE INDEX "idx_email_log_person_sent" ON "email_log" USING btree ("person_id","sent_at");--> statement-breakpoint
CREATE INDEX "idx_event_status_starts" ON "event" USING btree ("status","starts_at");--> statement-breakpoint
CREATE INDEX "idx_guest_rsvp_event" ON "guest_rsvp" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_guest_rsvp" ON "guest_rsvp" USING btree ("event_id","email");--> statement-breakpoint
CREATE INDEX "idx_person_email" ON "person" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_open_window" ON "window" USING btree ("status") WHERE status = 'open';