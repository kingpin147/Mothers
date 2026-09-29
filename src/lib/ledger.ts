import { db } from "@/db";
import { creditBatch, person, member, booking, auditLog, event as eventTable } from "@/db/schema";
import { eq, and, sql, asc, desc, gt, lte } from "drizzle-orm";
import { queueAndSendEmail } from "@/lib/brevo";
import { getAppUrl } from "@/lib/urls";

// ═══════════════════════════════════════════════════════════════════════════════
// THE MOTHERS — UNIFIED FIFO CREDIT WALLET ENGINE (§5)
// 
// Rules:
// 1. One unified FIFO wallet (credit_batch) for ALL account holders (pre-launch, members, guests).
// 2. Balance = SUM(remaining) over all non-expired batches for a person.
// 3. FIFO consumption: oldest expiring batch is consumed first.
// 4. Returns/refunds restore to credit_batch with original expiry (extended to min 30 days if <30d remain).
// 5. Value is flat €2/credit.
// ═══════════════════════════════════════════════════════════════════════════════

export interface WalletSummary {
  totalBalance: number;
  nextExpiringAmount: number;
  nextExpiringDate: Date | null;
  batches: Array<{
    id: string;
    amount: number;
    remaining: number;
    source: string;
    expiresAt: Date;
    createdAt: Date;
  }>;
}

// ─── 1. GET PERSON WALLET BALANCE & SUMMARY ──────────────────────────────────

export async function getPersonWalletSummary(
  personId: string,
  txOrDb: any = db
): Promise<WalletSummary> {
  const activeBatches = await txOrDb
    .select()
    .from(creditBatch)
    .where(
      and(
        eq(creditBatch.personId, personId),
        gt(creditBatch.remaining, 0),
        gt(creditBatch.expiresAt, sql`NOW()`)
      )
    )
    .orderBy(asc(creditBatch.expiresAt), asc(creditBatch.createdAt));

  let totalBalance = 0;
  for (const b of activeBatches) {
    totalBalance += b.remaining;
  }

  const nextBatch = activeBatches[0] || null;

  return {
    totalBalance,
    nextExpiringAmount: nextBatch ? nextBatch.remaining : 0,
    nextExpiringDate: nextBatch ? nextBatch.expiresAt : null,
    batches: activeBatches,
  };
}

export async function getPersonWalletBalance(
  personId: string,
  txOrDb: any = db
): Promise<number> {
  const summary = await getPersonWalletSummary(personId, txOrDb);
  return summary.totalBalance;
}

// ─── 2. GRANT CREDITS TO PERSON WALLET ───────────────────────────────────────

export async function grantCreditsToPerson(
  personId: string,
  amount: number,
  source: "topup" | "subscription" | "godmother" | "host_reward" | "admin_adjustment" | "refund",
  validityMonths: number = 6,
  txOrDb: any = db
): Promise<{ batchId: string; amount: number; expiresAt: Date }> {
  if (amount <= 0) throw new Error("GRANT_AMOUNT_MUST_BE_POSITIVE");

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + validityMonths);

  const [inserted] = await txOrDb
    .insert(creditBatch)
    .values({
      personId,
      amount,
      remaining: amount,
      source,
      expiresAt,
    })
    .returning();

  return {
    batchId: inserted.id,
    amount: inserted.amount,
    expiresAt: inserted.expiresAt,
  };
}

// ─── 3. SPEND CREDITS FIFO (OLDEST EXPIRING BATCH FIRST) ─────────────────────

export async function spendPersonCreditsFIFO(
  personId: string,
  amount: number,
  tx: any
): Promise<{ spent: number; batchesDeducted: Array<{ batchId: string; deducted: number; expiresAt: Date }> }> {
  if (amount <= 0) {
    return { spent: 0, batchesDeducted: [] };
  }

  const activeBatches = await tx
    .select()
    .from(creditBatch)
    .where(
      and(
        eq(creditBatch.personId, personId),
        gt(creditBatch.remaining, 0),
        gt(creditBatch.expiresAt, sql`NOW()`)
      )
    )
    .orderBy(asc(creditBatch.expiresAt), asc(creditBatch.createdAt))
    .for("update");

  let totalAvailable = 0;
  for (const b of activeBatches) {
    totalAvailable += b.remaining;
  }

  if (totalAvailable < amount) {
    throw new Error(`INSUFFICIENT_CREDITS: Required ${amount}, available ${totalAvailable}`);
  }

  let remainingToDeduct = amount;
  const batchesDeducted: Array<{ batchId: string; deducted: number; expiresAt: Date }> = [];

  for (const b of activeBatches) {
    if (remainingToDeduct <= 0) break;

    const deduct = Math.min(b.remaining, remainingToDeduct);
    const newRemaining = b.remaining - deduct;

    await tx
      .update(creditBatch)
      .set({ remaining: newRemaining })
      .where(eq(creditBatch.id, b.id));

    batchesDeducted.push({ batchId: b.id, deducted: deduct, expiresAt: b.expiresAt });
    remainingToDeduct -= deduct;
  }

  return { spent: amount, batchesDeducted };
}

// ─── 4. REFUND CREDITS WITH EXTENDED EXPIRATION SAFETY ───────────────────────

export async function refundPersonCredits(
  personId: string,
  amount: number,
  originalExpiry: Date | null = null,
  tx: any = db
): Promise<{ batchId: string; amount: number; expiresAt: Date }> {
  if (amount <= 0) throw new Error("REFUND_AMOUNT_MUST_BE_POSITIVE");

  // If fewer than 30 days remain on original expiry, extend to 30 days from now (§11)
  const minExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const targetExpiry = originalExpiry && new Date(originalExpiry) > minExpiry ? new Date(originalExpiry) : minExpiry;

  const [inserted] = await tx
    .insert(creditBatch)
    .values({
      personId,
      amount,
      remaining: amount,
      source: "refund",
      expiresAt: targetExpiry,
    })
    .returning();

  return {
    batchId: inserted.id,
    amount: inserted.amount,
    expiresAt: inserted.expiresAt,
  };
}

/**
 * Refund credits spent on a booking while preserving their original batch expiry dates (§5, §11, N-21).
 * Deductions are refunded with minimum 30 days safety extension.
 */
export async function refundBookingCredits(
  bookingRow: {
    personId: string | null;
    creditDeductions?: Array<{ batchId?: string; deducted?: number; expiresAt?: string | Date }> | null;
    creditsCharged?: number;
  },
  refundAmount?: number,
  tx: any = db
): Promise<Array<{ batchId: string; amount: number; expiresAt: Date }>> {
  if (!bookingRow.personId) return [];
  const amountToRefund = refundAmount !== undefined ? refundAmount : (bookingRow.creditsCharged || 0);
  if (amountToRefund <= 0) return [];

  const results: Array<{ batchId: string; amount: number; expiresAt: Date }> = [];
  const deductions = bookingRow.creditDeductions || [];

  let remaining = amountToRefund;
  if (Array.isArray(deductions) && deductions.length > 0) {
    for (const ded of deductions) {
      if (remaining <= 0) break;
      const dedAmount = ded.deducted || 0;
      const portion = Math.min(dedAmount, remaining);
      if (portion > 0) {
        const origExpiry = ded.expiresAt ? new Date(ded.expiresAt) : null;
        const res = await refundPersonCredits(bookingRow.personId, portion, origExpiry, tx);
        results.push(res);
        remaining -= portion;
      }
    }
  }

  // If any remaining portion was not covered by logged deductions, refund with min 30-day safety expiry
  if (remaining > 0) {
    const res = await refundPersonCredits(bookingRow.personId, remaining, null, tx);
    results.push(res);
  }

  return results;
}

// ─── 5. WORKERS & CRON HELPERS ───────────────────────────────────────────────

export async function runCreditExpiryWorker() {
  const now = new Date();
  const warning30d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const warning7d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 1. Expire past batches
  const expiredBatches = await db
    .select()
    .from(creditBatch)
    .where(and(lte(creditBatch.expiresAt, now), gt(creditBatch.remaining, 0)));

  let expiredCreditsCount = 0;
  for (const b of expiredBatches) {
    expiredCreditsCount += b.remaining;
    await db
      .update(creditBatch)
      .set({ remaining: 0 })
      .where(eq(creditBatch.id, b.id));
  }

  // 2. Find batches expiring in <= 30 days and <= 7 days
  const soonExpiring = await db
    .select()
    .from(creditBatch)
    .where(
      and(
        gt(creditBatch.remaining, 0),
        gt(creditBatch.expiresAt, now),
        lte(creditBatch.expiresAt, warning30d)
      )
    );

  const { sendCreditsExpiringEmail } = await import("@/lib/brevo");

  let warningsSent = 0;
  for (const b of soonExpiring) {
    const daysLeft = Math.ceil((new Date(b.expiresAt).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    // Match one exact day only (30 or 7) to avoid duplicate warning emails
    if (daysLeft === 30 || daysLeft === 7) {
      const personRecord = await db.query.person.findFirst({
        where: eq(person.id, b.personId),
      });
      if (personRecord && personRecord.email) {
        const formattedDate = new Date(b.expiresAt).toLocaleDateString(
          personRecord.locale === "es" ? "es-ES" : "en-GB",
          { day: "numeric", month: "long", year: "numeric" }
        );
        await sendCreditsExpiringEmail({
          personId: personRecord.id,
          email: personRecord.email,
          firstName: personRecord.firstName || "Friend",
          creditsExpiring: b.remaining,
          expiryDateFormatted: formattedDate,
          daysLeft: daysLeft <= 7 ? 7 : 30,
        });
        warningsSent++;
      }
    }
  }

  return {
    expiredBatchesCount: expiredBatches.length,
    expiredCreditsCount,
    soonExpiringCount: soonExpiring.length,
    warningsSent,
  };
}

export async function runLedgerReconciliation() {
  const persons = await db.select().from(person);
  let reconciledCount = 0;
  const discrepancies: Array<{ name: string; passed: boolean; details?: string }> = [];

  for (const p of persons) {
    const summary = await getPersonWalletSummary(p.id);
    reconciledCount++;
    if (summary.totalBalance < 0) {
      discrepancies.push({
        name: `Negative balance for person ${p.id}`,
        passed: false,
        details: `Calculated balance is ${summary.totalBalance}`,
      });
    }
  }

  const checks = [
    {
      name: "Non-negative Person Wallets",
      passed: discrepancies.length === 0,
      details: discrepancies.length === 0 ? "All person balances are non-negative." : `${discrepancies.length} discrepancy found.`,
    },
    ...discrepancies,
  ];

  return {
    passed: discrepancies.length === 0,
    checks,
  };
}

export async function extendGrantsOnPauseEnd(memberId: string, pauseMonths: number, tx: any = db) {
  const mem = await tx.query.member.findFirst({ where: eq(member.id, memberId) });
  if (!mem) return;

  await tx.execute(
    sql`UPDATE credit_batch SET expires_at = expires_at + (${pauseMonths} * INTERVAL '1 month') WHERE person_id = ${mem.personId} AND remaining > 0 AND expires_at > NOW()`
  );
}

export async function adjustCredits(
  arg1: string | { memberId: string; amount?: number; delta?: number; reason: string; actorAdminId?: string },
  arg2?: number | any,
  arg3?: string,
  arg4?: any
) {
  let memberId: string;
  let delta: number;
  let reason: string;
  let tx: any = db;

  if (typeof arg1 === "object") {
    memberId = arg1.memberId;
    delta = arg1.amount !== undefined ? arg1.amount : (arg1.delta ?? 0);
    reason = arg1.reason || "Admin adjustment";
    if (arg2 && typeof arg2 === "object") tx = arg2;
  } else {
    memberId = arg1;
    delta = typeof arg2 === "number" ? arg2 : 0;
    reason = arg3 || "Admin adjustment";
    if (arg4) tx = arg4;
  }

  const mem = await tx.query.member.findFirst({ where: eq(member.id, memberId) });
  if (!mem) throw new Error("MEMBER_NOT_FOUND");

  if (delta > 0) {
    const grantRes = await grantCreditsToPerson(mem.personId, delta, "admin_adjustment", 6, tx);
    return { newBalance: await getPersonWalletBalance(mem.personId, tx), batchId: grantRes.batchId };
  } else if (delta < 0) {
    const spendRes = await spendPersonCreditsFIFO(mem.personId, Math.abs(delta), tx);
    return { newBalance: await getPersonWalletBalance(mem.personId, tx), spent: spendRes.spent };
  }

  return { newBalance: await getPersonWalletBalance(mem.personId, tx) };
}

// ─── 6. LEGACY COMPATIBILITY STUBS ───────────────────────────────────────────

export async function getMemberLedgerSummary(memberId: string, txOrDb: any = db) {
  const mem = await txOrDb.query.member.findFirst({ where: eq(member.id, memberId) });
  if (!mem) return { totalBalance: 0, subscriptionCredits: 0, bonusCredits: 0, nextExpiringAmount: 0, nextExpiringDate: null };
  const wallet = await getPersonWalletSummary(mem.personId, txOrDb);
  return {
    totalBalance: wallet.totalBalance,
    subscriptionCredits: wallet.totalBalance,
    bonusCredits: 0,
    nextExpiringAmount: wallet.nextExpiringAmount,
    nextExpiringDate: wallet.nextExpiringDate,
  };
}

export async function grantMonthlySubscriptionCredits(memberId: string, sourcePaymentId?: string, txOrDb: any = db) {
  const mem = await txOrDb.query.member.findFirst({ where: eq(member.id, memberId) });
  if (!mem) return { granted: 0, capped: false };
  const count = mem.billingFrequency === "quarterly" ? 60 : 20;
  await grantCreditsToPerson(mem.personId, count, "subscription", 6, txOrDb);
  return { granted: count, capped: false };
}

export async function spendCredits(
  memberId: string,
  amount: number,
  sourceType: string,
  sourceId: string,
  reason: string,
  tx: any
) {
  const mem = await tx.query.member.findFirst({ where: eq(member.id, memberId) });
  if (!mem) throw new Error("MEMBER_NOT_FOUND");
  const result = await spendPersonCreditsFIFO(mem.personId, amount, tx);
  return { spendEntryId: result.batchesDeducted[0]?.batchId || "spend" };
}

export async function returnCredits(
  memberId: string,
  amountOrSpendId: any,
  sourceTypeOrReason?: string,
  sourceIdOrReason?: string,
  reasonOrTx?: any,
  optionalTx?: any,
  originalExpiry?: Date | null
) {
  let tx = db;
  let expiry: Date | null = originalExpiry || null;

  if (optionalTx && typeof optionalTx === "object" && optionalTx.query) {
    tx = optionalTx;
  } else if (reasonOrTx && typeof reasonOrTx === "object" && reasonOrTx.query) {
    tx = reasonOrTx;
  }

  if (reasonOrTx instanceof Date) {
    expiry = reasonOrTx;
  } else if (optionalTx instanceof Date) {
    expiry = optionalTx;
  }

  const mem = await tx.query.member.findFirst({ where: eq(member.id, memberId) });
  if (!mem) throw new Error("MEMBER_NOT_FOUND");

  const amount = typeof amountOrSpendId === "number" ? amountOrSpendId : 1;
  const result = await refundPersonCredits(mem.personId, amount, expiry, tx);
  return { returnEntryId: result.batchId };
}
