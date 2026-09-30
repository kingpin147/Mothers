import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false });

async function main() {
  console.log("🔍 Checking Database Schema...\n");

  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;

  console.log(`Found ${tables.length} tables in 'public' schema:`);
  for (const t of tables) {
    const cols = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${t.table_name}
      ORDER BY ordinal_position;
    `;
    console.log(`\n📦 Table: ${t.table_name} (${cols.length} columns)`);
    console.log(`   Columns: ${cols.map(c => c.column_name).join(", ")}`);
  }

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
