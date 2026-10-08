// Add missing _es columns for event table
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', connect_timeout: 15 });

const ALTERATIONS = [
  // event table - ES columns
  `ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "title_es" text`,
  `ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "description_es" text`,
  // stage table - ES column
  `ALTER TABLE "stage" ADD COLUMN IF NOT EXISTS "label_es" text`,
];

async function run() {
  try {
    for (const query of ALTERATIONS) {
      console.log(`Running: ${query}`);
      await sql.unsafe(query);
      console.log(`  ✓ Done`);
    }
    console.log('\n✅ All missing _es columns added!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.end();
  }
}
run();
