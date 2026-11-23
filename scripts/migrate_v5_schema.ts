import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
import postgres from "postgres";

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const sql = postgres(connectionString, { max: 1 });
  console.log("Connecting to database and applying v5 schema changes...");

  try {
    // 1. event table columns
    await sql`ALTER TABLE event ADD COLUMN IF NOT EXISTS google_maps_url text;`;
    await sql`ALTER TABLE event ADD COLUMN IF NOT EXISTS is_gathering boolean DEFAULT false;`;
    await sql`ALTER TABLE event ADD COLUMN IF NOT EXISTS gathering_host_person_id text REFERENCES person(id) ON DELETE SET NULL;`;
    await sql`ALTER TABLE event ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;`;
    await sql`ALTER TABLE event ADD COLUMN IF NOT EXISTS featured_month text;`;
    console.log("✓ Updated event table");

    // 2. partner table columns
    await sql`ALTER TABLE partner ADD COLUMN IF NOT EXISTS tier text;`;
    await sql`ALTER TABLE partner ADD COLUMN IF NOT EXISTS is_one_to_one boolean DEFAULT false;`;
    await sql`ALTER TABLE partner ADD COLUMN IF NOT EXISTS billing_model text;`;
    await sql`ALTER TABLE partner ADD COLUMN IF NOT EXISTS booking_url text;`;
    await sql`ALTER TABLE partner ADD COLUMN IF NOT EXISTS service_offered text;`;
    await sql`ALTER TABLE partner ADD COLUMN IF NOT EXISTS usual_price text;`;
    await sql`ALTER TABLE partner ADD COLUMN IF NOT EXISTS code_copy_count integer DEFAULT 0;`;
    await sql`ALTER TABLE partner ADD COLUMN IF NOT EXISTS link_click_count integer DEFAULT 0;`;
    await sql`ALTER TABLE partner ADD COLUMN IF NOT EXISTS recommendation_count integer DEFAULT 0;`;
    await sql`ALTER TABLE partner ADD COLUMN IF NOT EXISTS not_for_me_count integer DEFAULT 0;`;
    console.log("✓ Updated partner table");

    // 3. pro_review table
    await sql`
      CREATE TABLE IF NOT EXISTS pro_review (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        pro_id text NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
        account_id text NOT NULL REFERENCES person(id) ON DELETE CASCADE,
        vote text NOT NULL,
        tags text[] DEFAULT '{}'::text[],
        text text,
        anon boolean DEFAULT false NOT NULL,
        hidden boolean DEFAULT false NOT NULL,
        reports integer DEFAULT 0 NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL
      );
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pro_account ON pro_review(pro_id, account_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pro_review_pro_id ON pro_review(pro_id);`;
    console.log("✓ Ensured pro_review table exists");

    // 4. home_media table
    await sql`
      CREATE TABLE IF NOT EXISTS home_media (
        id text PRIMARY KEY,
        image_url text,
        focal_point text DEFAULT 'center' NOT NULL,
        alt_text text DEFAULT '' NOT NULL,
        parent_consent_confirmed boolean DEFAULT false NOT NULL,
        quote_text text,
        quote_who text,
        updated_at timestamptz DEFAULT now() NOT NULL
      );
    `;
    console.log("✓ Ensured home_media table exists");

    // 5. sponsor table
    await sql`
      CREATE TABLE IF NOT EXISTS sponsor (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name text NOT NULL,
        line text,
        perk text,
        url text,
        month text NOT NULL,
        fee_cents integer DEFAULT 0 NOT NULL,
        status text DEFAULT 'paused' NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_sponsor_month_status ON sponsor(month, status);`;
    console.log("✓ Ensured sponsor table exists");

    console.log("All v5 database schema updates applied successfully!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await sql.end();
  }
}

run();
