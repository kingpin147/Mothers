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
  console.log("=== ADMIN USERS ===");
  const admins = await sql`SELECT id, email, role, last_login_at, disabled_at FROM admin_user;`;
  console.log(admins);

  console.log("\n=== PERSONS WITH CREDENTIALS ===");
  const persons = await sql`
    SELECT p.id, p.email, p.first_name, p.last_name, mc.id as cred_id
    FROM person p
    LEFT JOIN member_credential mc ON mc.person_id = p.id
    LIMIT 10;
  `;
  console.log(persons);

  await sql.end();
}

main().catch(console.error);
