import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("No DATABASE_URL found in .env.local");
    process.exit(1);
  }

  const sql = postgres(dbUrl, { max: 1 });

  try {
    console.log("Starting schema sync...");

    // 1. Person columns
    console.log("Updating person table...");
    await sql`ALTER TABLE "person" ADD COLUMN IF NOT EXISTS "is_suspended" boolean DEFAULT false NOT NULL;`;
    await sql`ALTER TABLE "person" ADD COLUMN IF NOT EXISTS "suspended_at" timestamp with time zone;`;
    await sql`ALTER TABLE "person" ADD COLUMN IF NOT EXISTS "suspended_reason" text;`;
    await sql`ALTER TABLE "person" ADD COLUMN IF NOT EXISTS "profile_done" boolean DEFAULT false NOT NULL;`;
    await sql`ALTER TABLE "person" ADD COLUMN IF NOT EXISTS "profile_data" jsonb;`;

    // 2. Event columns
    console.log("Updating event table...");
    await sql`ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "member_credits" integer DEFAULT 0 NOT NULL;`;
    await sql`ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "non_member_credits" integer DEFAULT 0 NOT NULL;`;
    await sql`ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "needs_host" boolean DEFAULT false NOT NULL;`;
    await sql`ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "host_person_id" text REFERENCES "person"("id");`;
    await sql`ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "is_ran" boolean DEFAULT false NOT NULL;`;
    await sql`ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "ran_at" timestamp with time zone;`;
    await sql`ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "cancellation_window_hours" integer DEFAULT 24 NOT NULL;`;
    await sql`ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "non_member_opens_at" timestamp with time zone;`;

    // 3. FAQ Item columns
    console.log("Updating faq_item table...");
    await sql`ALTER TABLE "faq_item" ADD COLUMN IF NOT EXISTS "group_name" text DEFAULT 'Coming to an event now' NOT NULL;`;
    await sql`ALTER TABLE "faq_item" ADD COLUMN IF NOT EXISTS "policy_quote" text;`;
    await sql`ALTER TABLE "faq_item" ADD COLUMN IF NOT EXISTS "is_published" boolean DEFAULT true NOT NULL;`;

    // 4. Host Request columns
    console.log("Updating host_request table...");
    await sql`ALTER TABLE "host_request" ADD COLUMN IF NOT EXISTS "event_id" text REFERENCES "event"("id");`;
    await sql`ALTER TABLE "host_request" ADD COLUMN IF NOT EXISTS "credits_awarded" integer DEFAULT 0 NOT NULL;`;

    // 5. Setting table
    console.log("Ensuring setting table exists...");
    await sql`
      CREATE TABLE IF NOT EXISTS "setting" (
        "key" text PRIMARY KEY,
        "value" jsonb NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `;

    // 6. Audit Log table
    console.log("Ensuring audit_log table exists...");
    await sql`
      CREATE TABLE IF NOT EXISTS "audit_log" (
        "id" text PRIMARY KEY,
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
    `;

    // 7. Circle moderation & posts
    console.log("Ensuring circle tables exist...");
    await sql`
      CREATE TABLE IF NOT EXISTS "circle_post" (
        "id" text PRIMARY KEY,
        "person_id" text NOT NULL REFERENCES "person"("id") ON DELETE CASCADE,
        "title" text NOT NULL,
        "content" text NOT NULL,
        "tags" text[] DEFAULT '{}' NOT NULL,
        "is_anonymous" boolean DEFAULT false NOT NULL,
        "anonymous_area" text,
        "photos" text[] DEFAULT '{}' NOT NULL,
        "reply_count" integer DEFAULT 0 NOT NULL,
        "heart_count" integer DEFAULT 0 NOT NULL,
        "report_count" integer DEFAULT 0 NOT NULL,
        "is_hidden" boolean DEFAULT false NOT NULL,
        "is_pinned" boolean DEFAULT false NOT NULL,
        "last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS "circle_reply" (
        "id" text PRIMARY KEY,
        "post_id" text NOT NULL REFERENCES "circle_post"("id") ON DELETE CASCADE,
        "person_id" text NOT NULL REFERENCES "person"("id") ON DELETE CASCADE,
        "content" text NOT NULL,
        "is_anonymous" boolean DEFAULT false NOT NULL,
        "anonymous_area" text,
        "heart_count" integer DEFAULT 0 NOT NULL,
        "report_count" integer DEFAULT 0 NOT NULL,
        "is_hidden" boolean DEFAULT false NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS "circle_report" (
        "id" text PRIMARY KEY,
        "post_id" text REFERENCES "circle_post"("id") ON DELETE CASCADE,
        "reply_id" text REFERENCES "circle_reply"("id") ON DELETE CASCADE,
        "reporter_person_id" text NOT NULL REFERENCES "person"("id") ON DELETE CASCADE,
        "reason" text NOT NULL,
        "details" text,
        "status" text DEFAULT 'pending' NOT NULL,
        "action_taken" text,
        "moderated_by_admin_id" text REFERENCES "admin_user"("id"),
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `;

    console.log("Schema sync completed successfully!");
  } catch (err) {
    console.error("Schema sync failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
