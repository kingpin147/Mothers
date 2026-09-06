import postgres from "postgres";
import * as dotenv from "dotenv";
import crypto from "crypto";
dotenv.config({ path: ".env.local" });
if (!process.env.DATABASE_URL) dotenv.config({ path: ".env" });

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

    const adminRoleValues = ["owner", "manager", "host", "super_admin", "read_only"];
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
    await sql`ALTER TABLE member ADD COLUMN IF NOT EXISTS at_risk_since timestamptz;`;

    // 2. Window columns ("window" is a reserved keyword in Postgres)
    await sql`ALTER TABLE "window" ADD COLUMN IF NOT EXISTS tier_prices jsonb;`;

    // 3. Event columns
    await sql`ALTER TABLE event ADD COLUMN IF NOT EXISTS capacity_guest_gathering integer;`;
    await sql`ALTER TABLE event ADD COLUMN IF NOT EXISTS show_event_pass_cta boolean DEFAULT false NOT NULL;`;
    await sql`ALTER TABLE event ADD COLUMN IF NOT EXISTS childcare text DEFAULT 'child_inclusive' NOT NULL;`;
    await sql`ALTER TABLE event ADD COLUMN IF NOT EXISTS languages text[];`;
    await sql`UPDATE event SET languages = ARRAY['es', 'en'] WHERE languages IS NULL;`;

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

    // 6. Subscriber table (The Letter & Waitlist)
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS subscriber (
        id text PRIMARY KEY,
        name text,
        email text NOT NULL,
        list text DEFAULT 'letter' NOT NULL,
        source text,
        marketing_consent boolean DEFAULT true NOT NULL,
        marketing_consent_at timestamptz DEFAULT now() NOT NULL,
        unsubscribed_at timestamptz,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_subscriber_email_list ON subscriber(email, list);
    `);

    // 7. Partner hierarchy tables
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS partner_umbrella (
        id text PRIMARY KEY,
        name text NOT NULL UNIQUE,
        slug text NOT NULL UNIQUE,
        sort_order integer DEFAULT 0 NOT NULL,
        active boolean DEFAULT true NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS partner_specialty (
        id text PRIMARY KEY,
        umbrella_id text NOT NULL REFERENCES partner_umbrella(id) ON DELETE CASCADE,
        name text NOT NULL,
        slug text NOT NULL UNIQUE,
        is_sought boolean DEFAULT false NOT NULL,
        notes text,
        sort_order integer DEFAULT 0 NOT NULL,
        active boolean DEFAULT true NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL
      );
    `);

    // Seed default partner umbrellas & specialties if empty
    const defaultUmbrellas = [
      {
        name: "Health & Wellness",
        slug: "health-wellness",
        sortOrder: 1,
        specialties: ["Pelvic Floor Therapy", "Postpartum Doula", "Lactation Consulting", "Perinatal Nutrition", "Acupuncture & TCM"]
      },
      {
        name: "Mind & Relationships",
        slug: "mind-relationships",
        sortOrder: 2,
        specialties: ["Perinatal Psychology", "Couples Therapy", "Sleep Consulting", "Parent Coaching"]
      },
      {
        name: "Movement & Body",
        slug: "movement-body",
        sortOrder: 3,
        specialties: ["Prenatal Pilates", "Postnatal Yoga", "Personal Training", "Osteopathy"]
      },
      {
        name: "Childhood & Family",
        slug: "childhood-family",
        sortOrder: 4,
        specialties: ["Montessori Consulting", "Early Speech Therapy", "Family Photography", "Babywearing"]
      }
    ];

    for (const u of defaultUmbrellas) {
      const uId = crypto.randomUUID();
      await sql`
        INSERT INTO partner_umbrella (id, name, slug, sort_order)
        VALUES (${uId}, ${u.name}, ${u.slug}, ${u.sortOrder})
        ON CONFLICT (slug) DO NOTHING;
      `;
      const [existingU] = await sql`SELECT id FROM partner_umbrella WHERE slug = ${u.slug}`;
      if (existingU) {
        for (let i = 0; i < u.specialties.length; i++) {
          const specName = u.specialties[i];
          const specSlug = `${u.slug}-${specName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
          await sql`
            INSERT INTO partner_specialty (id, umbrella_id, name, slug, sort_order)
            VALUES (${crypto.randomUUID()}, ${existingU.id}, ${specName}, ${specSlug}, ${i + 1})
            ON CONFLICT (slug) DO NOTHING;
          `;
        }
      }
    }

    // 8. Partner Applications
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS partner_application (
        id text PRIMARY KEY,
        name text NOT NULL,
        business_name text NOT NULL,
        specialty text NOT NULL,
        email text NOT NULL,
        phone_e164 text,
        website text,
        instagram text,
        message text NOT NULL,
        status text DEFAULT 'submitted' NOT NULL,
        reviewed_by_admin_id text REFERENCES admin_user(id),
        reviewed_at timestamptz,
        notes_internal text,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL
      );
    `);

    // 9. Partner Perks, Code Pool, Perk Reveal
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS partner_perk (
        id text PRIMARY KEY,
        partner_id text NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
        title text NOT NULL,
        description text NOT NULL,
        perk_type text DEFAULT 'shared_code' NOT NULL,
        terms text,
        discount_code text,
        link_url text,
        valid_until timestamptz,
        active boolean DEFAULT true NOT NULL,
        sort_order integer DEFAULT 0 NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS perk_code_pool (
        id text PRIMARY KEY,
        perk_id text NOT NULL REFERENCES partner_perk(id) ON DELETE CASCADE,
        code text NOT NULL,
        claimed_by_member_id text REFERENCES member(id),
        claimed_at timestamptz,
        revealed_at timestamptz,
        created_at timestamptz DEFAULT now() NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_perk_code ON perk_code_pool(perk_id, code);

      CREATE TABLE IF NOT EXISTS perk_reveal (
        id text PRIMARY KEY,
        perk_id text NOT NULL REFERENCES partner_perk(id) ON DELETE CASCADE,
        member_id text NOT NULL REFERENCES member(id),
        revealed_at timestamptz DEFAULT now() NOT NULL,
        ip text,
        created_at timestamptz DEFAULT now() NOT NULL
      );
    `);

    // 10. Internal Notes
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS internal_note (
        id text PRIMARY KEY,
        entity_type text NOT NULL,
        entity_id text NOT NULL,
        author_admin_id text REFERENCES admin_user(id),
        author_name text,
        body text NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_internal_note_entity ON internal_note(entity_type, entity_id);
    `);

    // 11. PostgreSQL Trigger: Immutable credit_entry
    await sql.unsafe(`
      CREATE OR REPLACE FUNCTION prevent_credit_entry_mutation()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'credit_entry table is append-only. UPDATE and DELETE operations are strictly prohibited.';
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_credit_entry_immutable ON credit_entry;
      CREATE TRIGGER trg_credit_entry_immutable
      BEFORE UPDATE OR DELETE ON credit_entry
      FOR EACH ROW EXECUTE FUNCTION prevent_credit_entry_mutation();
    `);

    console.log("✅ DDL migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
