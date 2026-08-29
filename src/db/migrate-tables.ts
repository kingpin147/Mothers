import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false });

async function main() {
  console.log("🚀 Running DDL migration...");

  try {
    // 0. Ensure all Postgres ENUM values exist
    const creditEnumValues = [
      "grant", "joining_bonus", "purchase", "referral", "spend",
      "return_release", "return_cancellation", "expiry", "adjustment",
      "correction", "godmother", "godmother_bonus", "subscription_grant",
      "rollover", "event_booking", "event_refund", "expiration", "admin_adjustment"
    ];
    for (const val of creditEnumValues) {
      await sql.unsafe(`ALTER TYPE credit_entry_type ADD VALUE IF NOT EXISTS '${val}';`).catch(() => {});
    }

    const adminRoleValues = ["owner", "manager", "host", "super_admin"];
    for (const val of adminRoleValues) {
      await sql.unsafe(`ALTER TYPE admin_role ADD VALUE IF NOT EXISTS '${val}';`).catch(() => {});
    }

    const memberStatusValues = [
      "applicant", "accepted_awaiting_payment", "active", "past_due",
      "paused", "cancelled_at_period_end", "lapsed", "banned"
    ];
    for (const val of memberStatusValues) {
      await sql.unsafe(`ALTER TYPE member_status ADD VALUE IF NOT EXISTS '${val}';`).catch(() => {});
    }

    // 1. Member columns
    await sql`ALTER TABLE member ADD COLUMN IF NOT EXISTS tier text DEFAULT 'circle' NOT NULL;`;
    await sql`ALTER TABLE member ADD COLUMN IF NOT EXISTS billing_frequency text DEFAULT 'monthly' NOT NULL;`;
    await sql`ALTER TABLE member ADD COLUMN IF NOT EXISTS price_cents integer DEFAULT 3900 NOT NULL;`;
    await sql`ALTER TABLE member ADD COLUMN IF NOT EXISTS pause_months_used_year integer DEFAULT 0 NOT NULL;`;
    await sql`ALTER TABLE member ADD COLUMN IF NOT EXISTS no_show_count_90d integer DEFAULT 0 NOT NULL;`;
    await sql`ALTER TABLE member ADD COLUMN IF NOT EXISTS rsvp_suspended_at timestamptz;`;
    await sql`ALTER TABLE member ADD COLUMN IF NOT EXISTS referred_by_member_id text;`;

    // 2. Window columns ("window" is a reserved keyword in Postgres)
    await sql`ALTER TABLE "window" ADD COLUMN IF NOT EXISTS tier_prices jsonb;`;

    // 3. Event columns
    await sql`ALTER TABLE event ADD COLUMN IF NOT EXISTS capacity_guest_gathering integer;`;
    await sql`ALTER TABLE event ADD COLUMN IF NOT EXISTS show_event_pass_cta boolean DEFAULT false NOT NULL;`;
    await sql`ALTER TABLE event ADD COLUMN IF NOT EXISTS childcare text DEFAULT 'child_inclusive' NOT NULL;`;

    // 4. Booking columns
    await sql`ALTER TABLE booking ADD COLUMN IF NOT EXISTS pending_return_credits integer DEFAULT 0 NOT NULL;`;
    await sql`ALTER TABLE booking ADD COLUMN IF NOT EXISTS pending_return_state text DEFAULT 'none' NOT NULL;`;

    // 5. Stage tables
    await sql`
      CREATE TABLE IF NOT EXISTS stage (
        id text PRIMARY KEY,
        key text NOT NULL UNIQUE,
        label_en text NOT NULL,
        label_es text NOT NULL,
        sort_order integer DEFAULT 0 NOT NULL,
        age_from_months integer,
        age_to_months integer,
        active boolean DEFAULT true NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS event_stage (
        id text PRIMARY KEY,
        event_id text NOT NULL REFERENCES event(id) ON DELETE CASCADE,
        stage_id text NOT NULL REFERENCES stage(id) ON DELETE CASCADE,
        created_at timestamptz DEFAULT now() NOT NULL,
        CONSTRAINT idx_unique_event_stage UNIQUE(event_id, stage_id)
      );
    `;

    // Seed default stages if empty
    const stages = [
      { key: "expecting", labelEn: "Pregnant", labelEs: "Embarazo", sortOrder: 1 },
      { key: "babies", labelEn: "Babies", labelEs: "Bebés", sortOrder: 2, ageFromMonths: 0, ageToMonths: 12 },
      { key: "toddlers", labelEn: "Toddlers", labelEs: "Peques", sortOrder: 3, ageFromMonths: 12, ageToMonths: 36 },
      { key: "children36", labelEn: "Children", labelEs: "Niños", sortOrder: 4, ageFromMonths: 36, ageToMonths: 72 },
      { key: "children610", labelEn: "Big kids", labelEs: "Niños mayores", sortOrder: 5, ageFromMonths: 72, ageToMonths: 120 },
    ];

    for (const s of stages) {
      await sql`
        INSERT INTO stage (id, key, label_en, label_es, sort_order, age_from_months, age_to_months)
        VALUES (${crypto.randomUUID()}, ${s.key}, ${s.labelEn}, ${s.labelEs}, ${s.sortOrder}, ${s.ageFromMonths || null}, ${s.ageToMonths || null})
        ON CONFLICT (key) DO UPDATE SET
          label_en = EXCLUDED.label_en,
          label_es = EXCLUDED.label_es;
      `;
    }

    console.log("✅ DDL migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
