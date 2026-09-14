import * as dotenv from "dotenv";
dotenv.config();

import { db } from "../src/db";
import { person, memberCredential, member, adminUser } from "../src/db/schema";
import { eq, ilike } from "drizzle-orm";

async function main() {
  console.log("Checking accounts in DB...");

  const persons = await db.select().from(person);
  console.log("--- Persons (Total:", persons.length, ") ---");
  for (const p of persons) {
    console.log(`Person ID: ${p.id}, Name: ${p.firstName} ${p.lastName}, Email: ${p.email}`);
  }

  const members = await db.select().from(member);
  console.log("\n--- Members (Total:", members.length, ") ---");
  for (const m of members) {
    console.log(`Member ID: ${m.id}, Person ID: ${m.personId}, Status: ${m.status}, Tier: ${m.tierId}, Credits: ${m.creditBalance}`);
  }

  const creds = await db.select().from(memberCredential);
  console.log("\n--- Member Credentials (Total:", creds.length, ") ---");
  for (const c of creds) {
    console.log(`Credential ID: ${c.id}, Person ID: ${c.personId}`);
  }

  const admins = await db.select().from(adminUser);
  console.log("\n--- Admin Users (Total:", admins.length, ") ---");
  for (const a of admins) {
    console.log(`Admin ID: ${a.id}, Email: ${a.email}, Role: ${a.role}, Disabled: ${a.disabledAt}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
