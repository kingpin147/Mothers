ALTER TABLE "journal_post" ADD COLUMN "audience" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "journal_post" ADD COLUMN "views" integer DEFAULT 0 NOT NULL;