import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, lte, gte } from "drizzle-orm";
import * as schema from "../db/schema";

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(client, { schema });

  // Update existing event to have a valid future decisionAt (e.g. 19 Sept 2026)
  await db.update(schema.event)
    .set({
      decisionAt: new Date("2026-09-19T07:00:00.000Z"),
      guestOpenAt: new Date("2026-09-15T07:39:22.711Z"),
      guestCloseAt: new Date("2026-09-19T07:00:00.000Z"),
    })
    .where(eq(schema.event.id, "b6ba5998-a25a-47ab-b93c-15b7d6868d6a"));

  const events = await db.select().from(schema.event);
  console.log("Updated events:", events.map(e => ({ id: e.id, title: e.title, status: e.status, startsAt: e.startsAt, decisionAt: e.decisionAt })));

  await client.end();
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
 