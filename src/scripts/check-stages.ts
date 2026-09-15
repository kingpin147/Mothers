import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(client, { schema });

  const stages = await db.select().from(schema.stage);
  console.log("Stages in DB:", stages);

  const categories = await db.select().from(schema.eventCategory);
  console.log("Categories in DB:", categories);

  await client.end();
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
 