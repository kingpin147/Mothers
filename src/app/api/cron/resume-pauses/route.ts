import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { member, creditEntry, jobRun, auditLog } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { verifyCronAuth } from "@/lib/cron-auth";
import { extendGrantsOnPauseEnd } from "@/lib/ledger";

/**
 * Resume Pauses Cron (§8, §20.1a)
 * 
 * - Nightly check for members whose paused_until <= NOW()
 * - Sets status back to "active"
 * - Pushes expires_at out on active credit grants by the duration of the pause
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const startedAt = new Date();
  let resumedCount = 0;

  try {
    const pausedMembers = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.status, "paused"),
          sql`paused_until IS NOT NULL AND paused_until <= NOW()`
        )
      );

    for (const m of pausedMembers) {
      await db.transaction(async (tx) => {
        // Calculate pause duration in days (default 30 or 60 days based on pauseMonthsUsedYear)
        const pauseMonths = Math.max(1, m.pauseMonthsUsedYear || 1);
        const pauseDays = pauseMonths * 30;

        // Unpause member
        await tx
          .update(member)
          .set({
            status: "active",
            pausedUntil: null,
            updatedAt: new Date(),
          })
          .where(eq(member.id, m.id));

        // Extend credit grant expirations
        await extendGrantsOnPauseEnd(m.id, pauseDays, tx);

        await tx.insert(auditLog).values({
          actorType: "system",
          action: "resume_member_pause",
          entity: "member",
          entityId: m.id,
          after: { status: "active", pauseDaysExtended: pauseDays },
        });
      });

      resumedCount++;
    }

    await db.insert(jobRun).values({
      jobKey: "resume_pauses",
      outcome: "success",
      startedAt,
      finishedAt: new Date(),
      counts: { resumedCount },
    });

    return NextResponse.json({ success: true, resumedCount });
  } catch (error: any) {
    await db.insert(jobRun).values({
      jobKey: "resume_pauses",
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
