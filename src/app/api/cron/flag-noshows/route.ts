import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { booking, member, jobRun, auditLog, errorLog } from "@/db/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * No-Show Auto-Block Cron (§11 / Rule Register)
 *
 * Checks each active member for 2+ no-shows in the last 90 days.
 * If found, sets member.noShowBlockedAt = now, blocking RSVP until
 * the member contacts the club (admin manually clears it).
 *
 * Runs daily — safe to re-run (idempotent: won't re-flag already-flagged members).
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const startedAt = new Date();
  let evaluated = 0;
  let flagged = 0;

  try {
    const windowStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

    // Find all members with 2+ no-shows in the last 90 days
    const noShowCounts = await db
      .select({
        memberId: booking.memberId,
        count: sql<number>`count(*)::int`,
      })
      .from(booking)
      .where(
        and(
          eq(booking.noShow, true),
          gte(booking.bookedAt, windowStart),
          sql`${booking.memberId} IS NOT NULL`
        )
      )
      .groupBy(booking.memberId);

    evaluated = noShowCounts.length;

    for (const row of noShowCounts) {
      if (!row.memberId || row.count < 2) continue;

      // Check if already blocked (atRiskSince used as no-show block flag)
      const memberRecord = await db.query.member.findFirst({
        where: eq(member.id, row.memberId),
      });

      if (!memberRecord) continue;

      // Already flagged — skip
      if (memberRecord.atRiskSince) continue;

      // Flag the member
      await db
        .update(member)
        .set({
          atRiskSince: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(member.id, row.memberId));

      await db.insert(auditLog).values({
        actorType: "system",
        action: "flag_noshows",
        entity: "member",
        entityId: row.memberId,
        after: {
          noShowCount: row.count,
          windowDays: 90,
          flaggedAt: new Date().toISOString(),
        },
      });

      flagged++;
    }

    await db.insert(jobRun).values({
      jobKey: "flag_noshows",
      outcome: "success",
      startedAt,
      finishedAt: new Date(),
      counts: { evaluated, flagged },
    });

    return NextResponse.json({ success: true, evaluated, flagged });
  } catch (error: any) {
    console.error("flag-noshows cron error:", error);

    await db.insert(jobRun).values({
      jobKey: "flag_noshows",
      outcome: "failed",
      startedAt,
      finishedAt: new Date(),
      error: error?.message || "Unknown error",
    });

    await db.insert(errorLog).values({
      source: "cron:flag_noshows",
      message: error?.message || "Unknown error",
      stackTrace: error?.stack,
    });

    return NextResponse.json(
      { error: error?.message || "CRON_FAILED" },
      { status: 500 }
    );
  }
}
