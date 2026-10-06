import postgres from 'postgres';
import 'dotenv/config';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const sql = postgres(connectionString);
  
  try {
    console.log('Altering email_log constraints...');
    await sql`ALTER TABLE "email_log" ALTER COLUMN "person_id" DROP NOT NULL;`;
    await sql`ALTER TABLE "email_log" DROP CONSTRAINT IF EXISTS "email_log_person_id_person_id_fk";`;
    console.log('Constraints updated successfully!');
  } catch (error) {
    console.error('Error altering email_log:', error);
  } finally {
    await sql.end();
  }
}

main();
