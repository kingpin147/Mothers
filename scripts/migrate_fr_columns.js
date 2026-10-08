// Direct SQL migration to add _fr columns using postgres.js
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  connect_timeout: 15,
  idle_timeout: 10,
});

const ALTERATIONS = [
  // journal_post table
  `ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "title_fr" text`,
  `ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "excerpt_fr" text`,
  `ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "body_fr" text`,
  `ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "quote_fr" text`,
  `ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "author_role_fr" text`,
  `ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "byline_fr" text`,
  `ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "reviewed_note_fr" text`,
  `ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "seo_title_fr" text`,
  `ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "seo_description_fr" text`,
  // faq_item table
  `ALTER TABLE "faq_item" ADD COLUMN IF NOT EXISTS "question_fr" text`,
  `ALTER TABLE "faq_item" ADD COLUMN IF NOT EXISTS "answer_fr" text`,
  // event table
  `ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "title_fr" text`,
  `ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "description_fr" text`,
  // stage table
  `ALTER TABLE "stage" ADD COLUMN IF NOT EXISTS "label_fr" text`,
];

async function run() {
  try {
    for (const query of ALTERATIONS) {
      console.log(`Running: ${query}`);
      await sql.unsafe(query);
      console.log(`  ✓ Done`);
    }
    console.log('\n✅ All _fr columns added successfully!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.end();
  }
}

run();
