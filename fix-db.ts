import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log('Adding columns to journal_post...');
    await sql`ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "audience" text DEFAULT 'public' NOT NULL;`;
    await sql`ALTER TABLE "journal_post" ADD COLUMN IF NOT EXISTS "views" integer DEFAULT 0 NOT NULL;`;
    console.log('Columns added successfully.');
  } catch (error) {
    console.error('Error adding columns:', error);
  } finally {
    await sql.end();
  }
}

main();
