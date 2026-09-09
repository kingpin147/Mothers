ALTER TYPE "public"."admin_role" ADD VALUE 'read_only';--> statement-breakpoint
CREATE TABLE "internal_note" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"author_admin_id" text,
	"author_name" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_application" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"business_name" text NOT NULL,
	"specialty" text NOT NULL,
	"email" text NOT NULL,
	"phone_e164" text,
	"website" text,
	"instagram" text,
	"message" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"reviewed_by_admin_id" text,
	"reviewed_at" timestamp with time zone,
	"notes_internal" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_perk" (
	"id" text PRIMARY KEY NOT NULL,
	"partner_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"perk_type" text DEFAULT 'shared_code' NOT NULL,
	"terms" text,
	"discount_code" text,
	"link_url" text,
	"valid_until" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_specialty" (
	"id" text PRIMARY KEY NOT NULL,
	"umbrella_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"is_sought" boolean DEFAULT false NOT NULL,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_specialty_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "partner_umbrella" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_umbrella_name_unique" UNIQUE("name"),
	CONSTRAINT "partner_umbrella_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "perk_code_pool" (
	"id" text PRIMARY KEY NOT NULL,
	"perk_id" text NOT NULL,
	"code" text NOT NULL,
	"claimed_by_member_id" text,
	"claimed_at" timestamp with time zone,
	"revealed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perk_reveal" (
	"id" text PRIMARY KEY NOT NULL,
	"perk_id" text NOT NULL,
	"member_id" text NOT NULL,
	"revealed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriber" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"list" text DEFAULT 'letter' NOT NULL,
	"source" text,
	"marketing_consent" boolean DEFAULT true NOT NULL,
	"marketing_consent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "internal_note" ADD CONSTRAINT "internal_note_author_admin_id_admin_user_id_fk" FOREIGN KEY ("author_admin_id") REFERENCES "public"."admin_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_application" ADD CONSTRAINT "partner_application_reviewed_by_admin_id_admin_user_id_fk" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "public"."admin_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_perk" ADD CONSTRAINT "partner_perk_partner_id_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partner"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_specialty" ADD CONSTRAINT "partner_specialty_umbrella_id_partner_umbrella_id_fk" FOREIGN KEY ("umbrella_id") REFERENCES "public"."partner_umbrella"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perk_code_pool" ADD CONSTRAINT "perk_code_pool_perk_id_partner_perk_id_fk" FOREIGN KEY ("perk_id") REFERENCES "public"."partner_perk"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perk_code_pool" ADD CONSTRAINT "perk_code_pool_claimed_by_member_id_member_id_fk" FOREIGN KEY ("claimed_by_member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perk_reveal" ADD CONSTRAINT "perk_reveal_perk_id_partner_perk_id_fk" FOREIGN KEY ("perk_id") REFERENCES "public"."partner_perk"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perk_reveal" ADD CONSTRAINT "perk_reveal_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_internal_note_entity" ON "internal_note" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_perk_code" ON "perk_code_pool" USING btree ("perk_id","code");--> statement-breakpoint
CREATE INDEX "idx_subscriber_email_list" ON "subscriber" USING btree ("email","list");