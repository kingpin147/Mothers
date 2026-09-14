import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not found in environment.");
    process.exit(1);
  }

  const sql = postgres(dbUrl);

  try {
    console.log("Migrating journal_post table schema...");

    await sql`ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "title_es" text;`;
    await sql`ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'postpartum' NOT NULL;`;
    await sql`ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "excerpt_es" text;`;
    await sql`ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "body_es" text;`;
    await sql`ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "quote_en" text;`;
    await sql`ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "quote_es" text;`;
    await sql`ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "author_role_en" text;`;
    await sql`ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "author_role_es" text;`;
    await sql`ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "byline_en" text;`;
    await sql`ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "byline_es" text;`;
    await sql`ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "reviewed_note_en" text;`;
    await sql`ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "reviewed_note_es" text;`;
    await sql`ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "seo_title_es" text;`;
    await sql`ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "seo_description_es" text;`;

    console.log("✓ journal_post table migrated successfully with all bilingual & category columns.");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await sql.end();
  }
}

main();
