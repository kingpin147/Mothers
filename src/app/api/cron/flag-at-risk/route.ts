import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { member, booking, jobRun, auditLog } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * Flag At-Risk Members Cron (§8)
 * 
 * Nightly. Sets `at_risk_since` for active members with no attended booking
 * in the last 60 days. Clears it for members who have recently attended.
 * 
 * NEVER emails anyone — it surfaces a prompt for a human in the admin panel.
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const startedAt = new Date();
  let flagged = 0;
  let cleared = 0;

  try {
    // ── FLAG: Active members with no attendance in 60 days ──────────────────
    const atRiskMembers = await db.execute(sql`
      SELECT m.id, m.person_id
      FROM member m
      WHERE m.status = 'active'
      AND m.at_risk_since IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM booking b
        WHERE b.member_id = m.id
        AND b.status = 'attended'
        AND b.attended_at > NOW() - INTERVAL '60 days'
      )
      AND m.joined_at IS NOT NULL
      AND m.joined_at < NOW() - INTERVAL '60 days'
    `);

    for (const m of atRiskMembers as any[]) {
      await db
        .update(member)
        .set({
          atRiskSince: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(member.id, m.id));

      await db.insert(auditLog).values({
        actorType: "system",
        action: "flag_at_risk",
        entity: "member",
        entityId: m.id,
        after: { reason: "No attendance in 60 days" },
      });

      flagged++;
    }

    // ── CLEAR: Members who have attended recently ───────────────────────────
    const recentlyAttended = await db.execute(sql`
      SELECT m.id
      FROM member m
      WHERE m.at_risk_since IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM booking b
        WHERE b.member_id = m.id
        AND b.status = 'attended'
        AND b.attended_at > NOW() - INTERVAL '60 days'
      )
    `);

    for (const m of recentlyAttended as any[]) {
      await db
        .update(member)
        .set({
          atRiskSince: null,
          updatedAt: new Date(),
        })
        .where(eq(member.id, m.id));

      await db.insert(auditLog).values({
        actorType: "system",
        action: "clear_at_risk",
        entity: "member",
        entityId: m.id,
        after: { reason: "Recent attendance detected" },
      });

      cleared++;
    }

    await db.insert(jobRun).values({
      jobKey: "flag_at_risk",
      outcome: "success",
      startedAt,
      finishedAt: new Date(),
      counts: { flagged, cleared },
    });

    return NextResponse.json({ success: true, flagged, cleared });
  } catch (error: any) {
    await db.insert(jobRun).values({
      jobKey: "flag_at_risk",
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
