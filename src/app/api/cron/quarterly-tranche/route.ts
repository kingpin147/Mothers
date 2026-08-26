import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { member, creditEntry, jobRun } from "@/db/schema";
import { eq, and, sql, gte, lte, lt } from "drizzle-orm";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * Quarterly Credits Tranche Job (§6 Credit Rules)
 *
 * At months 2 and 3 of a member's subscription, they receive an additional
 * 20-credit tranche on top of their normal monthly grant.
 *
 * This job runs daily (e.g. at 07:00 UTC) and:
 * 1. Finds active members whose joined_at was exactly 2 months ago (±1 day window)
 *    and who have NOT yet received a 'tranche_month2' grant.
 * 2. Finds active members whose joined_at was exactly 3 months ago (±1 day window)
 *    and who have NOT yet received a 'tranche_month3' grant.
 * 3. Issues a +20 credit entry with type='grant' and reason='tranche_month2' or
 *    'tranche_month3', with a 6-month expiry from today.
 *
 * Idempotency: We check for an existing credit_entry with reason matching the
 * tranche key, so re-runs are safe.
 */

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const startedAt = new Date();
  let granted = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    const now = new Date();

    // ── Helper: date 2 or 3 months ago (within a 1-day window to handle slight drift) ──
    const monthsAgo = (n: number) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - n);
      return d;
    };

    const windowStart = (n: number) => {
      const d = monthsAgo(n);
      d.setDate(d.getDate() - 1);
      return d;
    };
    const windowEnd = (n: number) => {
      const d = monthsAgo(n);
      d.setDate(d.getDate() + 1);
      return d;
    };

    const tranches = [
      { month: 2, reason: "tranche_month2", label: "Month 2 tranche bonus (+20 credits)" },
      { month: 3, reason: "tranche_month3", label: "Month 3 tranche bonus (+20 credits)" },
    ];

    for (const tranche of tranches) {
      // Find active members who joined in the target month window
      const candidates = await db
        .select({
          id: member.id,
          joinedAt: member.joinedAt,
          status: member.status,
        })
        .from(member)
        .where(
          and(
            eq(member.status, "active"),
            sql`${member.joinedAt} >= ${windowStart(tranche.month).toISOString()}::timestamptz`,
            sql`${member.joinedAt} < ${windowEnd(tranche.month).toISOString()}::timestamptz`
          )
        );

      for (const m of candidates) {
        try {
          // Idempotency check: has this tranche already been issued?
          const existing = await db
            .select({ id: creditEntry.id })
            .from(creditEntry)
            .where(
              and(
                eq(creditEntry.memberId, m.id),
                eq(creditEntry.reason, tranche.reason)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            skipped++;
            continue;
          }

          // Grant 20 credits with 6-month expiry
          const expiresAt = new Date(now);
          expiresAt.setMonth(expiresAt.getMonth() + 6);

          await db.insert(creditEntry).values({
            memberId: m.id,
            amount: 20,
            type: "grant",
            expiresAt,
            sourceType: "cron",
            sourceId: `quarterly_tranche_month${tranche.month}`,
            reason: tranche.reason,
          });

          granted++;
        } catch (err: any) {
          errors.push(`member=${m.id} tranche=${tranche.reason}: ${err?.message}`);
        }
      }
    }

    await db.insert(jobRun).values({
      jobKey: "quarterly_credits_tranche",
      outcome: errors.length > 0 ? "partial" : "success",
      startedAt,
      finishedAt: new Date(),
      counts: { granted, skipped, errors: errors.length },
      error: errors.length > 0 ? errors.join("; ") : undefined,
    });

    return NextResponse.json({ success: true, granted, skipped, errors });
  } catch (error: any) {
    await db.insert(jobRun).values({
      jobKey: "quarterly_credits_tranche",
      outcome: "failed",
      startedAt,
      finishedAt: new Date(),
      error: error?.message || "Unknown error",
    });

    return NextResponse.json(
      { error: error?.message || "CRON_FAILED" },
      { status: 500 }
    );
  }
}
