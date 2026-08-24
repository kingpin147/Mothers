import { db } from "@/db";
import { creditEntry, creditAllocation, member, eventPass, booking, auditLog } from "@/db/schema";
import { eq, and, sql, asc, desc, ne } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════════════════════
// THE MOTHERS — BULLETPROOF CREDIT LEDGER ENGINE (§5)
// 
// Rules:
// 1. Credits are money — append-only ledger, never a mutable balance column.
// 2. Balance = SUM(amount) over all entries for a member.
// 3. Monthly grant of 20, capped at 40 subscription credits.
// 4. FIFO spend by expires_at, then by created_at.
// 5. Returns go back to the grants they came from with original expiry.
// 6. Expiry is a ledger event (negative entry), not a filter.
// ═══════════════════════════════════════════════════════════════════════════════

export interface LedgerSummary {
  totalBalance: number;
  subscriptionCredits: number;
  bonusCredits: number;
  capRoom: number;
  nextExpiringAmount: number;
  nextExpiringDate: Date | null;
}

// ─── 1. GET LEDGER SUMMARY — works with either db or transaction ─────────────

export async function getMemberLedgerSummary(
  memberId: string,
  txOrDb: any = db
): Promise<LedgerSummary> {
  const entries = await txOrDb
    .select()
    .from(creditEntry)
    .where(eq(creditEntry.memberId, memberId))
    .orderBy(asc(creditEntry.createdAt));

  let totalBalance = 0;
  let bonusCredits = 0;

  for (const entry of entries) {
    totalBalance += entry.amount;
    if (
      entry.type === "joining_bonus" ||
      (entry.type === "grant" && entry.sourceType === "referral") ||
      (entry.type === "adjustment" && entry.sourceType === "godmother")
    ) {
      bonusCredits += Math.max(0, entry.amount);
    }
  }

  const subscriptionCredits = Math.max(0, totalBalance - bonusCredits);
  const capRoom = Math.max(0, 40 - subscriptionCredits);

  // Next expiring grant (non-expired, positive)
  const nextExpiringGrant = await txOrDb
    .select()
    .from(creditEntry)
    .where(
      and(
        eq(creditEntry.memberId, memberId),
        eq(creditEntry.type, "grant"),
        sql`expires_at IS NOT NULL AND expires_at > NOW() AND amount > 0`
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

// ─── 2. GRANT MONTHLY CREDITS — TRANSACTION-SAFE WITH ROW LOCK (§5, §20.2) ──

export async function grantMonthlySubscriptionCredits(
  memberId: string,
  sourcePaymentId?: string,
  txOrDb: any = db
): Promise<{ granted: number; capped: boolean }> {
  // Lock the member row first to prevent concurrent grant race conditions.
  // If called within a transaction (from webhook), this lock serializes grants.
  await txOrDb
    .select()
    .from(member)
    .where(eq(member.id, memberId))
    .for("update");

  // Compute balance WITHIN the same transaction
  const summary = await getMemberLedgerSummary(memberId, txOrDb);

  const defaultGrant = 20;
  const actualGrant = Math.min(defaultGrant, summary.capRoom);

  if (actualGrant > 0) {
    // 6-month FIFO expiry from grant date
    const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

    await txOrDb.insert(creditEntry).values({
      memberId,
      amount: actualGrant,
      type: "grant",
      expiresAt,
      sourceType: "subscription",
      sourceId: sourcePaymentId || null,
      reason:
        actualGrant < defaultGrant
          ? `Monthly grant: ${actualGrant} credits (trimmed from ${defaultGrant} — balance would exceed 40 cap)`
          : `Monthly grant: ${actualGrant} credits`,
    });

    await txOrDb.insert(auditLog).values({
      actorId: memberId,
      actorType: "system",
      action: "grant_subscription_credits",
      entity: "credit_entry",
      entityId: memberId,
      after: {
        amount: actualGrant,
        defaultGrant,
        capped: actualGrant < defaultGrant,
        balanceBefore: summary.totalBalance,
        balanceAfter: summary.totalBalance + actualGrant,
      },
    });
  }

  return { granted: actualGrant, capped: actualGrant < defaultGrant };
}

// ─── 3. FIFO SPEND — ALLOCATE AGAINST OLDEST GRANTS (§5) ────────────────────

export async function spendCredits(
  memberId: string,
  amount: number,
  sourceType: string,
  sourceId: string,
  reason: string,
  tx: any
): Promise<{ spendEntryId: string }> {
  if (amount <= 0) {
    throw new Error("SPEND_AMOUNT_MUST_BE_POSITIVE");
  }

  // Write the spend entry (negative amount)
  const spendInsert = await tx
    .insert(creditEntry)
    .values({
      memberId,
      amount: -amount,
      type: "spend",
      sourceType,
      sourceId,
      reason,
    })
    .returning({ id: creditEntry.id });

  const spendEntryId = spendInsert[0].id;

  // FIFO allocation: oldest non-expired grants first
  // We need to find grants that still have unallocated capacity
  const activeGrants = await tx
    .select({
      id: creditEntry.id,
      amount: creditEntry.amount,
      expiresAt: creditEntry.expiresAt,
      createdAt: creditEntry.createdAt,
    })
    .from(creditEntry)
    .where(
      and(
        eq(creditEntry.memberId, memberId),
        sql`type IN ('grant', 'joining_bonus', 'return_release', 'return_cancellation')`,
        sql`amount > 0`,
        sql`(expires_at IS NULL OR expires_at > NOW())`
      )
    )
    .orderBy(asc(creditEntry.expiresAt), asc(creditEntry.createdAt));

  let remainingToDeduct = amount;

  for (const grant of activeGrants) {
    if (remainingToDeduct <= 0) break;

    // How much of this grant has already been allocated?
    const usedResult = await tx
      .select({ totalUsed: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(creditAllocation)
      .where(eq(creditAllocation.grantEntryId, grant.id));

    const totalUsed = Number(usedResult[0]?.totalUsed || 0);
    const available = grant.amount - totalUsed;

    if (available <= 0) continue;

    const deductAmount = Math.min(available, remainingToDeduct);

    await tx.insert(creditAllocation).values({
      spendEntryId,
      grantEntryId: grant.id,
      amount: deductAmount,
    });

    remainingToDeduct -= deductAmount;
  }

  if (remainingToDeduct > 0) {
    throw new Error("INSUFFICIENT_CREDITS_FOR_FIFO_ALLOCATION");
  }

  return { spendEntryId };
}

// ─── 4. FIFO RETURN — RESTORE TO ORIGINAL GRANTS (§5) ───────────────────────

export async function returnCredits(
  memberId: string,
  originalSpendEntryId: string,
  returnType: "return_release" | "return_cancellation",
  reason: string,
  tx: any
): Promise<{ totalReturned: number }> {
  // Find all allocations from the original spend
  const allocations = await tx
    .select()
    .from(creditAllocation)
    .where(eq(creditAllocation.spendEntryId, originalSpendEntryId));

  if (allocations.length === 0) {
    // Fallback: if no allocations exist (legacy data), find the spend entry amount
    const spendEntry = await tx.query.creditEntry.findFirst({
      where: eq(creditEntry.id, originalSpendEntryId),
    });
    if (!spendEntry) return { totalReturned: 0 };

    const returnAmount = Math.abs(spendEntry.amount);
    if (returnAmount > 0) {
      await tx.insert(creditEntry).values({
        memberId,
        amount: returnAmount,
        type: returnType,
        sourceType: "booking",
        sourceId: originalSpendEntryId,
        reason,
      });
    }
    return { totalReturned: returnAmount };
  }

  let totalReturned = 0;

  for (const alloc of allocations) {
    // Find the original grant to get its expiry
    const originalGrant = await tx.query.creditEntry.findFirst({
      where: eq(creditEntry.id, alloc.grantEntryId),
    });

    if (!originalGrant) continue;

    let returnExpiresAt = originalGrant.expiresAt;

    // §5: If the original grant has since expired, return as fresh grant
    // expiring at the member's next period end
    if (returnExpiresAt && new Date(returnExpiresAt) <= new Date()) {
      const memberRecord = await tx.query.member.findFirst({
        where: eq(member.id, memberId),
      });
      returnExpiresAt = memberRecord?.currentPeriodEnd
        ? new Date(memberRecord.currentPeriodEnd)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // fallback 30 days
    }

    await tx.insert(creditEntry).values({
      memberId,
      amount: alloc.amount,
      type: returnType,
      expiresAt: returnExpiresAt,
      sourceType: "booking",
      sourceId: originalSpendEntryId,
      reason:
        originalGrant.expiresAt && new Date(originalGrant.expiresAt) <= new Date()
          ? `${reason} (original grant expired — fresh expiry assigned)`
          : reason,
    });

    totalReturned += alloc.amount;
  }

  return { totalReturned };
}

// ─── 5. EXPIRE AGED CREDITS — IDEMPOTENT, NO DOUBLE-EXPIRY (§5, §8) ────────

export async function runCreditExpiryWorker(): Promise<{
  expiredTotal: number;
  membersAffected: number;
}> {
  let expiredTotal = 0;
  const affectedMemberIds = new Set<string>();

  await db.transaction(async (tx) => {
    // Find expired grants that do NOT already have an expiry entry written against them.
    // This is the fix for the double-expiry bug — truly idempotent.
    const expiredGrants = await tx
      .select()
      .from(creditEntry)
      .where(
        and(
          eq(creditEntry.type, "grant"),
          sql`amount > 0`,
          sql`expires_at IS NOT NULL AND expires_at <= NOW()`,
          // Exclude grants that already have an expiry entry
          sql`id NOT IN (
            SELECT source_id FROM credit_entry 
            WHERE type = 'expiry' AND source_type = 'credit_entry' AND source_id IS NOT NULL
          )`
        )
      );

    for (const grant of expiredGrants) {
      // Calculate remaining unspent from this grant
      const usedResult = await tx
        .select({ totalUsed: sql<number>`COALESCE(SUM(amount), 0)` })
        .from(creditAllocation)
        .where(eq(creditAllocation.grantEntryId, grant.id));

      const totalUsed = Number(usedResult[0]?.totalUsed || 0);
      const remainingUnspent = grant.amount - totalUsed;

      if (remainingUnspent > 0) {
        await tx.insert(creditEntry).values({
          memberId: grant.memberId,
          amount: -remainingUnspent,
          type: "expiry",
          sourceType: "credit_entry",
          sourceId: grant.id,
          reason: `FIFO expiry: ${remainingUnspent} unspent credits from grant on ${new Date(grant.createdAt).toISOString().slice(0, 10)} (expired ${new Date(grant.expiresAt!).toISOString().slice(0, 10)})`,
        });

        expiredTotal += remainingUnspent;
        affectedMemberIds.add(grant.memberId);
      }
    }
  });

  return { expiredTotal, membersAffected: affectedMemberIds.size };
}

// ─── 6. ADMIN CREDIT ADJUSTMENT WITH MANDATORY REASON (§19, §20.2) ──────────

export async function adjustCredits(params: {
  memberId: string;
  amount: number;
  reason: string;
  actorAdminId: string;
}): Promise<{ entryId: string; newBalance: number }> {
  if (!params.reason || params.reason.trim().length < 3) {
    throw new Error("REASON_REQUIRED_FOR_ADJUSTMENT");
  }
  if (params.amount === 0) {
    throw new Error("ZERO_ADJUSTMENT_NOT_ALLOWED");
  }

  let entryId = "";
  let newBalance = 0;

  await db.transaction(async (tx) => {
    // Lock member row
    await tx
      .select()
      .from(member)
      .where(eq(member.id, params.memberId))
      .for("update");

    // Compute current balance
    const summary = await getMemberLedgerSummary(params.memberId, tx);

    // Prevent negative balance
    if (summary.totalBalance + params.amount < 0) {
      throw new Error(
        `ADJUSTMENT_WOULD_MAKE_BALANCE_NEGATIVE: current=${summary.totalBalance}, adjustment=${params.amount}`
      );
    }

    const inserted = await tx
      .insert(creditEntry)
      .values({
        memberId: params.memberId,
        amount: params.amount,
        type: "adjustment",
        sourceType: "admin_user",
        sourceId: params.actorAdminId,
        reason: params.reason.trim(),
        actorAdminId: params.actorAdminId,
        // Positive adjustments get an expiry, negative don't
        expiresAt:
          params.amount > 0
            ? new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
            : null,
      })
      .returning({ id: creditEntry.id });

    entryId = inserted[0].id;
    newBalance = summary.totalBalance + params.amount;

    await tx.insert(auditLog).values({
      actorId: params.actorAdminId,
      actorType: "admin",
      action: "adjust_credits",
      entity: "credit_entry",
      entityId: entryId,
      before: { balance: summary.totalBalance },
      after: {
        balance: newBalance,
        amount: params.amount,
        reason: params.reason,
      },
    });
  });

  return { entryId, newBalance };
}

// ─── 7. GUEST PASS → MEMBERSHIP €35 DISCOUNT (§3.4, §20.4) ──────────────────

export async function checkPassJoiningDiscount(personId: string): Promise<{
  hasDiscount: boolean;
  passId: string | null;
  discountCents: number;
  joiningFeePaidCents: number;
}> {
  // Check for paid event pass within 30-day credit window
  const recentPass = await db.query.eventPass.findFirst({
    where: and(
      eq(eventPass.personId, personId),
      eq(eventPass.status, "paid"),
      sql`credit_expires_at > NOW()`
    ),
    orderBy: desc(eventPass.purchasedAt),
  });

  if (recentPass) {
    return {
      hasDiscount: true,
      passId: recentPass.id,
      discountCents: 3500,
      joiningFeePaidCents: 2300, // €58 - €35
    };
  }

  return {
    hasDiscount: false,
    passId: null,
    discountCents: 0,
    joiningFeePaidCents: 5800,
  };
}

// ─── 8. RECONCILIATION ASSERTIONS (§5, §17) ─────────────────────────────────

export interface ReconciliationResult {
  passed: boolean;
  checks: {
    name: string;
    passed: boolean;
    details?: string;
  }[];
}

export async function runLedgerReconciliation(): Promise<ReconciliationResult> {
  const checks: ReconciliationResult["checks"] = [];

  // CHECK 1: No member balance is ever negative
  const negativeBalances = await db
    .select({
      memberId: creditEntry.memberId,
      balance: sql<number>`SUM(amount)`,
    })
    .from(creditEntry)
    .groupBy(creditEntry.memberId)
    .having(sql`SUM(amount) < 0`);

  checks.push({
    name: "no_negative_balances",
    passed: negativeBalances.length === 0,
    details:
      negativeBalances.length > 0
        ? `${negativeBalances.length} members with negative balance: ${negativeBalances.map((r) => `${r.memberId}=${r.balance}`).join(", ")}`
        : undefined,
  });

  // CHECK 2: Sum of allocations against a grant never exceeds the grant
  const overAllocated = await db.execute(sql`
    SELECT ca.grant_entry_id, ce.amount AS grant_amount, SUM(ca.amount) AS allocated
    FROM credit_allocation ca
    JOIN credit_entry ce ON ce.id = ca.grant_entry_id
    GROUP BY ca.grant_entry_id, ce.amount
    HAVING SUM(ca.amount) > ce.amount
  `);

  checks.push({
    name: "no_over_allocated_grants",
    passed: (overAllocated as any).length === 0,
    details:
      (overAllocated as any).length > 0
        ? `${(overAllocated as any).length} grants over-allocated`
        : undefined,
  });

  // CHECK 3: Every spend has a booking
  const spendsWithoutBooking = await db.execute(sql`
    SELECT ce.id, ce.source_id
    FROM credit_entry ce
    WHERE ce.type = 'spend' AND ce.source_type = 'booking'
    AND ce.source_id NOT IN (SELECT id FROM event WHERE TRUE)
    AND ce.source_id NOT IN (SELECT id FROM booking WHERE TRUE)
  `);

  checks.push({
    name: "every_spend_has_source",
    passed: (spendsWithoutBooking as any).length === 0,
    details:
      (spendsWithoutBooking as any).length > 0
        ? `${(spendsWithoutBooking as any).length} orphan spend entries`
        : undefined,
  });

  // CHECK 4: Every active booking has a spend (for non-free events)
  const bookingsWithoutSpend = await db.execute(sql`
    SELECT b.id, b.event_id, b.credits_charged
    FROM booking b
    JOIN event e ON e.id = b.event_id
    WHERE b.status IN ('held', 'confirmed')
    AND b.kind = 'member'
    AND b.credits_charged > 0
    AND NOT EXISTS (
      SELECT 1 FROM credit_entry ce
      WHERE ce.type = 'spend' AND ce.source_type = 'booking' AND ce.source_id = b.event_id
      AND ce.member_id = b.member_id
    )
  `);

  checks.push({
    name: "every_active_booking_has_spend",
    passed: (bookingsWithoutSpend as any).length === 0,
    details:
      (bookingsWithoutSpend as any).length > 0
        ? `${(bookingsWithoutSpend as any).length} active bookings missing spend entries`
        : undefined,
  });

  // CHECK 5: Seat counts match booking counts per event
  const seatMismatches = await db.execute(sql`
    SELECT e.id, e.title, e.capacity_member,
      (SELECT COUNT(*) FROM booking b WHERE b.event_id = e.id AND b.kind = 'member' AND b.status IN ('held', 'confirmed')) AS active_member_bookings,
      e.capacity_guest,
      (SELECT COUNT(*) FROM booking b WHERE b.event_id = e.id AND b.kind = 'guest' AND b.status IN ('held', 'confirmed')) AS active_guest_bookings
    FROM event e
    WHERE e.status IN ('published_pending', 'confirmed')
    AND (
      (SELECT COUNT(*) FROM booking b WHERE b.event_id = e.id AND b.kind = 'member' AND b.status IN ('held', 'confirmed')) > e.capacity_member
      OR
      (SELECT COUNT(*) FROM booking b WHERE b.event_id = e.id AND b.kind = 'guest' AND b.status IN ('held', 'confirmed')) > e.capacity_guest
    )
  `);

  checks.push({
    name: "no_over_capacity_events",
    passed: (seatMismatches as any).length === 0,
    details:
      (seatMismatches as any).length > 0
        ? `${(seatMismatches as any).length} events over capacity`
        : undefined,
  });

  return {
    passed: checks.every((c) => c.passed),
    checks,
  };
}
