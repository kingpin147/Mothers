import "dotenv/config";
import { db } from "../src/db";
import { person, member, application, payment, creditEntry } from "../src/db/schema";
import { eq, and, sql, or } from "drizzle-orm";

async function main() {
  console.log("🔍 Scanning for active members with missing payment or pending application status...");

  // Find all active members
  const activeMembers = await db
    .select({
      memberId: member.id,
      personId: member.personId,
      status: member.status,
      monthlyPriceCents: member.monthlyPriceCents,
      joinedAt: member.joinedAt,
      stripeSubscriptionId: member.stripeSubscriptionId,
      email: person.email,
      firstName: person.firstName,
      lastName: person.lastName,
    })
    .from(member)
    .innerJoin(person, eq(member.personId, person.id))
    .where(eq(member.status, "active"));

  console.log(`Found ${activeMembers.length} active member(s).`);

  for (const m of activeMembers) {
    console.log(`\nProcessing member: ${m.firstName} ${m.lastName} (${m.email})`);

    // 1. Update joinedAt if null
    if (!m.joinedAt) {
      console.log("  -> Setting joinedAt to current date...");
      await db.update(member).set({ joinedAt: new Date() }).where(eq(member.id, m.memberId));
    }

    // 2. Ensure application is marked as paid
    const apps = await db
      .select()
      .from(application)
      .where(eq(application.personId, m.personId));

    for (const app of apps) {
      if (app.status !== "paid" || !app.isPaid) {
        console.log(`  -> Updating application ${app.id} to status: 'paid', isPaid: true...`);
        await db
          .update(application)
          .set({
            status: "paid",
            isPaid: true,
            updatedAt: new Date(),
          })
          .where(eq(application.id, app.id));
      }
    }

    // 3. Ensure payment record exists in payment table
    const existingPayment = await db
      .select()
      .from(payment)
      .where(
        and(
          eq(payment.personId, m.personId),
          or(
            eq(payment.purpose, "subscription_monthly"),
            eq(payment.purpose, "subscription_quarterly"),
            eq(payment.purpose, "subscription")
          )
        )
      );

    if (existingPayment.length === 0) {
      console.log("  -> Inserting missing subscription payment into payment table...");
      await db.insert(payment).values({
        personId: m.personId,
        purpose: "subscription_monthly",
        amountCents: m.monthlyPriceCents || 3900,
        currency: "EUR",
        status: "succeeded",
        stripeInvoiceId: m.stripeSubscriptionId || `sub_sync_${Date.now()}`,
        occurredAt: m.joinedAt || new Date(),
      });
    } else {
      console.log(`  ✓ Payment already recorded (${existingPayment.length} entries).`);
    }

    // 4. Ensure initial credit grant exists
    const existingCredits = await db
      .select()
      .from(creditEntry)
      .where(and(eq(creditEntry.memberId, m.memberId), eq(creditEntry.type, "grant")));

    if (existingCredits.length === 0) {
      console.log("  -> Granting 20 initial membership credits...");
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 6);
      await db.insert(creditEntry).values({
        memberId: m.memberId,
        amount: 20,
        type: "grant",
        reason: "Initial Membership Grant",
        sourceType: "subscription_monthly",
        expiresAt,
      });
    } else {
      console.log(`  ✓ Initial credits already granted.`);
    }
  }

  console.log("\n✅ All active member records, applications, and payments are synchronized!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Sync Error:", err);
  process.exit(1);
});
