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

  const { sql } = await import("drizzle-orm");
  const now = new Date();
  const t7Date = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const t10Date = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  console.log("Now:", now.toISOString());
  console.log("t7Date:", t7Date.toISOString());
  console.log("t10Date:", t10Date.toISOString());

  const { or, isNotNull } = await import("drizzle-orm");
  const t7RawEvents = await db.select({
    id: schema.event.id,
    title: schema.event.title,
    startsAt: schema.event.startsAt,
    minToConfirm: schema.event.minToConfirm,
    decisionAt: schema.event.decisionAt,
  }).from(schema.event)
    .where(
      and(
        eq(schema.event.status, "published_pending"),
        gte(schema.event.startsAt, now),
        or(
          lte(schema.event.startsAt, t7Date),
          and(isNotNull(schema.event.decisionAt), lte(schema.event.decisionAt, t7Date))
        )
      )
    )
    .orderBy(schema.event.startsAt);

  console.log("t7RawEvents count:", t7RawEvents.length, t7RawEvents);

  const t10RawEvents = await db.select({
    id: schema.event.id,
    title: schema.event.title,
    startsAt: schema.event.startsAt,
    minToConfirm: schema.event.minToConfirm,
  }).from(schema.event)
    .where(and(eq(schema.event.status, "published_pending"), lte(schema.event.startsAt, t10Date), gte(schema.event.startsAt, now)))
    .orderBy(schema.event.startsAt);

  console.log("t10RawEvents count:", t10RawEvents.length, t10RawEvents);

  await client.end();
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
 