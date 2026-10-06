import "dotenv/config";
import { db } from "@/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    console.log("Creating email_verification table if not exists...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "email_verification" (
        "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" text NOT NULL,
        "code" text NOT NULL,
        "expires_at" timestamp with time zone NOT NULL,
        "attempts" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "idx_email_verification_email" ON "email_verification"("email");
    `);
    console.log("email_verification table is ready.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

main();
