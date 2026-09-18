import { db } from "@/db";
import { adminUser } from "@/db/schema";
import { sql } from "drizzle-orm";

async function cleanTestData() {
  console.log("--- Starting Test Data Cleanup (Preserving Live Events & Admin Accounts) ---");

  const admins = await db.select().from(adminUser);
  const adminEmails = admins.map((a) => a.email.toLowerCase().trim());
  console.log(`Found ${admins.length} admin accounts to protect:`, adminEmails);

  console.log("Step 1: delete credit_allocation");
  await db.execute(sql`DELETE FROM credit_allocation`);

  console.log("Step 2: delete booking");
  await db.execute(sql`DELETE FROM booking`);

  console.log("Step 3: delete event_waitlist");
  await db.execute(sql`DELETE FROM event_waitlist`);

  console.log("Step 4: delete event_pass");
  await db.execute(sql`DELETE FROM event_pass`);

  console.log("Step 5: delete guest_rsvp");
  await db.execute(sql`DELETE FROM guest_rsvp`);

  console.log("Step 6: disable credit_entry trigger");
  await db.execute(sql`ALTER TABLE credit_entry DISABLE TRIGGER trg_credit_entry_immutable`);

  console.log("Step 7: delete credit_entry");
  await db.execute(sql`DELETE FROM credit_entry`);

  console.log("Step 8: enable credit_entry trigger");
  await db.execute(sql`ALTER TABLE credit_entry ENABLE TRIGGER trg_credit_entry_immutable`);

  console.log("Step 9: delete payment");
  await db.execute(sql`DELETE FROM payment`);

  console.log("Step 10: delete member_credential");
  await db.execute(sql`DELETE FROM member_credential`);

  console.log("Step 11: delete member");
  await db.execute(sql`DELETE FROM member`);

  console.log("Step 12: delete application");
  await db.execute(sql`DELETE FROM application`);

  console.log("Step 13: delete consent_record");
  await db.execute(sql`DELETE FROM consent_record`);

  console.log("Step 14: delete email_log");
  await db.execute(sql`DELETE FROM email_log`);

  console.log("Step 15: delete test persons");
  if (adminEmails.length > 0) {
    const emailsFormatted = adminEmails.map((e) => `'${e}'`).join(",");
    await db.execute(sql.raw(`DELETE FROM person WHERE LOWER(email) NOT IN (${emailsFormatted})`));
  } else {
    await db.execute(sql`DELETE FROM person`);
  }

  console.log("✓ Test data successfully cleared! Live events and admin accounts are preserved.");
  process.exit(0);
}

cleanTestData().catch((err) => {
  console.error("Failed to clean test data:", err);
  process.exit(1);
});
