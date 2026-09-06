import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { member, jobRun, auditLog } from "@/db/schema";
import { sql } from "drizzle-orm";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * Reset Pause Allowance Cron (§8, §20.1a)
 * 
 * Runs on 1 January (or on demand) to zero out pause_months_used_year
 * for all members.
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const startedAt = new Date();

  try {
    const updated = await db
      .update(member)
      .set({
        pauseMonthsUsedYear: 0,
        updatedAt: new Date(),
      })
      .where(sql`pause_months_used_year > 0`)
      .returning({ id: member.id });

    await db.insert(jobRun).values({
      jobKey: "reset_pause_allowance",
      outcome: "success",
      startedAt,
      finishedAt: new Date(),
      counts: { resetCount: updated.length },
    });

    await db.insert(auditLog).values({
      actorType: "system",
      action: "reset_pause_allowance_annual",
      entity: "member",
      entityId: "all",
      after: { count: updated.length },
    });

    return NextResponse.json({ success: true, resetCount: updated.length });
  } catch (error: any) {
    await db.insert(jobRun).values({
      jobKey: "reset_pause_allowance",
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
