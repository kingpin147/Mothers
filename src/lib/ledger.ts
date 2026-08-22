import { db } from "@/db";
import { creditEntry, creditAllocation, member, eventPass, auditLog, payment } from "@/db/schema";
import { eq, and, sql, asc, desc, lte } from "drizzle-orm";

export interface LedgerSummary {
  totalBalance: number;
  subscriptionCredits: number;
  bonusCredits: number; // Godmother bonuses (exempt from 40-cap)
  capRoom: number; // Room left under the 40-credit rollover cap
  nextExpiringAmount: number;
  nextExpiringDate: Date | null;
}

// ─── 1. GET DETAILED LEDGER SUMMARY (§5) ────────────────────────────────────

export async function getMemberLedgerSummary(memberId: string): Promise<LedgerSummary> {
  const entries = await db
    .select()
    .from(creditEntry)
    .where(eq(creditEntry.memberId, memberId))
    .orderBy(asc(creditEntry.createdAt));

  let totalBalance = 0;
  let bonusCredits = 0;

  for (const entry of entries) {
    totalBalance += entry.amount;
    if (entry.type === "joining_bonus" || (entry.type === "grant" && entry.sourceType === "referral")) {
      bonusCredits += Math.max(0, entry.amount);
    }
  }

  // Active subscription credits subject to 40 cap
  const subscriptionCredits = Math.max(0, totalBalance - bonusCredits);
  const capRoom = Math.max(0, 40 - subscriptionCredits);

  // Find next expiring non-zero grant
  const nextExpiringGrant = await db
    .select()
    .from(creditEntry)
    .where(
      and(
        eq(creditEntry.memberId, memberId),
        eq(creditEntry.type, "grant"),
        sql`expires_at IS NOT NULL AND expires_at > NOW()`
      )
    )
    .orderBy(asc(creditEntry.expiresAt))
    .limit(1);

  return {
    totalBalance,
    subscriptionCredits,
    bonusCredits,
    capRoom,
    nextExpiringAmount: nextExpiringGrant[0]?.amount || 0,
    nextExpiringDate: nextExpiringGrant[0]?.expiresAt || null,
  };
}

// ─── 2. GRANT MONTHLY SUBSCRIPTION CREDITS WITH 40-CAP ENFORCEMENT (§5, §20.1) ─

export async function grantMonthlySubscriptionCredits(
  memberId: string,
  sourcePaymentId?: string,
  txOrDb: any = db
): Promise<{ granted: number; capped: boolean }> {
  const summary = await getMemberLedgerSummary(memberId);

  // Default monthly grant is 20 credits (§5)
  const defaultGrant = 20;
  // Cap allows up to 40 subscription credits to roll over
  const actualGrant = Math.min(defaultGrant, summary.capRoom);

  if (actualGrant > 0) {
    const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); // 6-month FIFO expiry

    await txOrDb.insert(creditEntry).values({
      memberId,
      amount: actualGrant,
      type: "grant",
      expiresAt,
      sourceType: "subscription",
      sourceId: sourcePaymentId || null,
      reason: `Monthly subscription grant (${actualGrant} credits applied${actualGrant < defaultGrant ? " - capped at 40 max" : ""})`,
    });

    await txOrDb.insert(auditLog).values({
      actorId: memberId,
      actorType: "system",
      action: "grant_subscription_credits",
      entity: "credit_entry",
      after: { amount: actualGrant, capped: actualGrant < defaultGrant },
    });
  }

  return { granted: actualGrant, capped: actualGrant < defaultGrant };
}

// ─── 3. EXPIRE AGED CREDITS ENGINE (FIFO CRON TASK) (§5, §17) ─────────────────

export async function runCreditExpiryWorker(): Promise<{ expiredTotal: number; membersAffected: number }> {
  let expiredTotal = 0;
  let membersAffected = 0;

  await db.transaction(async (tx) => {
    // Find all expired grants that haven't been fully spent
    const expiredGrants = await tx
      .select()
      .from(creditEntry)
      .where(
        and(
          eq(creditEntry.type, "grant"),
          sql`expires_at IS NOT NULL AND expires_at <= NOW()`
        )
      );

    for (const grant of expiredGrants) {
      // Find allocations against this grant
      const allocations = await tx
        .select({ totalUsed: sql<number>`COALESCE(SUM(amount), 0)` })
        .from(creditAllocation)
        .where(eq(creditAllocation.grantEntryId, grant.id));

      const totalUsed = Number(allocations[0]?.totalUsed || 0);
      const remainingUnspent = grant.amount - totalUsed;

      if (remainingUnspent > 0) {
        // Expire leftover unspent credits
        await tx.insert(creditEntry).values({
          memberId: grant.memberId,
          amount: -remainingUnspent,
          type: "expiry",
          sourceType: "credit_entry",
          sourceId: grant.id,
          reason: `FIFO Expiry of 6-month grant from ${new Date(grant.createdAt).toLocaleDateString()}`,
        });

        expiredTotal += remainingUnspent;
        membersAffected++;
      }
    }
  });

  return { expiredTotal, membersAffected };
}

// ─── 4. GUEST PASS TO MEMBERSHIP €35 DISCOUNT ENGINE (§3.4, §20.4) ───────────

export async function checkPassJoiningDiscount(personId: string): Promise<{
  hasDiscount: boolean;
  passId: string | null;
  discountCents: number;
  joiningFeePaidCents: number; // €2300 (or €5800 standard)
}> {
  // Check for paid event pass within last 30 days
  const recentPass = await db.query.eventPass.findFirst({
    where: and(
      eq(eventPass.personId, personId),
      eq(eventPass.status, "paid"),
      sql`credit_expires_at > NOW() AND credited_against_joining_fee = FALSE`
    ),
    orderBy: desc(eventPass.purchasedAt),
  });

  if (recentPass) {
    return {
      hasDiscount: true,
      passId: recentPass.id,
      discountCents: 3500, // €35
      joiningFeePaidCents: 2300, // €58 - €35 = €23
    };
  }

  return {
    hasDiscount: false,
    passId: null,
    discountCents: 0,
    joiningFeePaidCents: 5800, // €58 standard
  };
}
