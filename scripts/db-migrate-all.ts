import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function runMigration() {
  console.log("Starting DB migration check...");

  // 1. Columns for person
  console.log("Adding columns to 'person' table if missing...");
  await db.execute(sql`
    ALTER TABLE "person" 
    ADD COLUMN IF NOT EXISTS "invite_code" text UNIQUE,
    ADD COLUMN IF NOT EXISTS "badges" text[],
    ADD COLUMN IF NOT EXISTS "notify_messages" boolean DEFAULT true NOT NULL,
    ADD COLUMN IF NOT EXISTS "notify_replies" boolean DEFAULT true NOT NULL,
    ADD COLUMN IF NOT EXISTS "communities" text[];
  `);

  // 2. Columns for event
  console.log("Adding columns to 'event' table if missing...");
  await db.execute(sql`
    ALTER TABLE "event"
    ADD COLUMN IF NOT EXISTS "booking_cutoff_hours" integer DEFAULT 3 NOT NULL,
    ADD COLUMN IF NOT EXISTS "plan_only" boolean DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS "community_id" text,
    ADD COLUMN IF NOT EXISTS "is_community_only" boolean DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS "price_cents" integer DEFAULT 0 NOT NULL;
  `);

  // 3. Columns for circle_post (gazettePost)
  console.log("Adding columns to 'circle_post' table if missing...");
  await db.execute(sql`
    ALTER TABLE "circle_post"
    ADD COLUMN IF NOT EXISTS "slug" text UNIQUE,
    ADD COLUMN IF NOT EXISTS "topics" text[],
    ADD COLUMN IF NOT EXISTS "seen_count" integer DEFAULT 0 NOT NULL;
  `);

  // 4. Create new tables if not exist
  console.log("Creating new tables if missing...");

  // gazette_follow
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "gazette_follow" (
      "id" text PRIMARY KEY,
      "person_id" text NOT NULL REFERENCES "person"("id") ON DELETE CASCADE,
      "post_id" text NOT NULL REFERENCES "circle_post"("id") ON DELETE CASCADE,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_person_post_follow" ON "gazette_follow" ("person_id", "post_id");
    CREATE INDEX IF NOT EXISTS "idx_gazette_follow_person" ON "gazette_follow" ("person_id");
  `);

  // gazette_view
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "gazette_view" (
      "id" text PRIMARY KEY,
      "person_id" text NOT NULL REFERENCES "person"("id") ON DELETE CASCADE,
      "post_id" text NOT NULL REFERENCES "circle_post"("id") ON DELETE CASCADE,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_person_post_view" ON "gazette_view" ("person_id", "post_id");
    CREATE INDEX IF NOT EXISTS "idx_gazette_view_post" ON "gazette_view" ("post_id");
  `);

  // conversation
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "conversation" (
      "id" text PRIMARY KEY,
      "person_one_id" text NOT NULL REFERENCES "person"("id") ON DELETE CASCADE,
      "person_two_id" text NOT NULL REFERENCES "person"("id") ON DELETE CASCADE,
      "last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
      "last_message_text" text,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_conversation_pair" ON "conversation" ("person_one_id", "person_two_id");
    CREATE INDEX IF NOT EXISTS "idx_conversation_last_message" ON "conversation" ("last_message_at");
  `);

  // direct_message
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "direct_message" (
      "id" text PRIMARY KEY,
      "conversation_id" text NOT NULL REFERENCES "conversation"("id") ON DELETE CASCADE,
      "sender_id" text NOT NULL REFERENCES "person"("id") ON DELETE CASCADE,
      "recipient_id" text NOT NULL REFERENCES "person"("id") ON DELETE CASCADE,
      "content" text NOT NULL,
      "read_at" timestamp with time zone,
      "hidden_by_admin" boolean DEFAULT false NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "idx_direct_message_conversation" ON "direct_message" ("conversation_id", "created_at");
    CREATE INDEX IF NOT EXISTS "idx_direct_message_recipient_read" ON "direct_message" ("recipient_id", "read_at");
  `);

  // message_block
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "message_block" (
      "id" text PRIMARY KEY,
      "blocker_person_id" text NOT NULL REFERENCES "person"("id") ON DELETE CASCADE,
      "blocked_person_id" text NOT NULL REFERENCES "person"("id") ON DELETE CASCADE,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_message_block" ON "message_block" ("blocker_person_id", "blocked_person_id");
  `);

  // message_report
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "message_report" (
      "id" text PRIMARY KEY,
      "conversation_id" text NOT NULL REFERENCES "conversation"("id") ON DELETE CASCADE,
      "reporter_person_id" text NOT NULL REFERENCES "person"("id") ON DELETE CASCADE,
      "reported_person_id" text NOT NULL REFERENCES "person"("id") ON DELETE CASCADE,
      "reason" text NOT NULL,
      "status" text DEFAULT 'pending' NOT NULL,
      "reviewed_by_admin_id" text REFERENCES "admin_user"("id"),
      "reviewed_at" timestamp with time zone,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "idx_message_report_status" ON "message_report" ("status");
    CREATE INDEX IF NOT EXISTS "idx_message_report_conversation" ON "message_report" ("conversation_id");
  `);

  // community
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "community" (
      "id" text PRIMARY KEY,
      "name" text NOT NULL,
      "slug" text NOT NULL UNIQUE,
      "type" text NOT NULL,
      "description" text,
      "contact_person_id" text REFERENCES "person"("id"),
      "contact_email" text NOT NULL,
      "contact_phone" text,
      "legal_name" text,
      "tax_id" text,
      "has_insurance" boolean DEFAULT false NOT NULL,
      "commission_rate_percent" integer DEFAULT 15 NOT NULL,
      "stripe_account_id" text,
      "stripe_customer_id" text,
      "stripe_card_on_file" boolean DEFAULT false NOT NULL,
      "invite_code" text NOT NULL UNIQUE,
      "approved" boolean DEFAULT false NOT NULL,
      "publishes_without_review" boolean DEFAULT false NOT NULL,
      "approved_at" timestamp with time zone,
      "approved_by_admin_id" text REFERENCES "admin_user"("id"),
      "free_events_this_month" integer DEFAULT 0 NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "idx_community_slug" ON "community" ("slug");
    CREATE UNIQUE INDEX IF NOT EXISTS "idx_community_invite_code" ON "community" ("invite_code");
    CREATE INDEX IF NOT EXISTS "idx_community_approved" ON "community" ("approved");
  `);

  // 5. Backfill invite_code for existing persons who do not have one
  console.log("Backfilling invite_code for persons without one...");
  const rawPersons: any = await db.execute(sql`
    SELECT id, first_name, invite_code FROM "person" WHERE "invite_code" IS NULL
  `);
  const personsList = Array.isArray(rawPersons) ? rawPersons : rawPersons.rows || [];
  console.log(`Found ${personsList.length} persons without invite_code`);
  
  for (const row of personsList) {
    const rawFirst = (row.first_name || "MEMBER").trim().replace(/[^a-zA-Z]/g, "").toUpperCase();
    const prefix = rawFirst.slice(0, 8) || "MEMBER";
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `${prefix}-${randomHex}`;
    await db.execute(sql`
      UPDATE "person" SET "invite_code" = ${code} WHERE "id" = ${row.id} AND "invite_code" IS NULL
    `);
  }

  console.log("Migration complete!");
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
