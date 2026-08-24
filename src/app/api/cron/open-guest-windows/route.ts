import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { event, jobRun, auditLog } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * Open Guest Windows Cron (§7.2, §8, §20.4)
 * 
 * - Confirmed events: Open guest window at T-14, close at T-2
 * - Skip Signature events and events > 18 credits (members only)
 * - Threshold events that just confirmed: open immediately
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const startedAt = new Date();
  let opened = 0;
  let closed = 0;

  try {
    // ── OPEN: Confirmed events within 14 days that haven't been opened yet ──
    const eventsToOpen = await db
      .select()
      .from(event)
      .where(
        and(
          eq(event.status, "confirmed"),
          eq(event.isSignature, false),
          sql`credit_cost <= 18`,
          sql`guest_open_at IS NULL`,
          sql`starts_at > NOW()`,
          sql`starts_at <= NOW() + INTERVAL '14 days'`
        )
      );

    for (const ev of eventsToOpen) {
      const guestCloseAt = new Date(
        new Date(ev.startsAt).getTime() - 2 * 24 * 60 * 60 * 1000
      );

      // Only open if close date is still in the future
      if (guestCloseAt > new Date()) {
        await db
          .update(event)
          .set({
            guestOpenAt: new Date(),
            guestCloseAt,
            updatedAt: new Date(),
          })
          .where(eq(event.id, ev.id));

        await db.insert(auditLog).values({
          actorType: "system",
          action: "open_guest_window",
          entity: "event",
          entityId: ev.id,
          after: { guestCloseAt: guestCloseAt.toISOString() },
        });

        opened++;
      }
    }

    // ── CLOSE: Events where guest window should be closed (T-2 passed) ──
    const eventsToClose = await db
      .select()
      .from(event)
      .where(
        and(
          eq(event.status, "confirmed"),
          sql`guest_open_at IS NOT NULL`,
          sql`guest_close_at IS NOT NULL`,
          sql`guest_close_at <= NOW()`
        )
      );

    // Guest close is enforced by the access rules at read time,
    // but we log it for visibility
    closed = eventsToClose.length;

    await db.insert(jobRun).values({
      jobKey: "open_guest_windows",
      outcome: "success",
      startedAt,
      finishedAt: new Date(),
      counts: { opened, closed },
    });

    return NextResponse.json({ success: true, opened, closed });
  } catch (error: any) {
    await db.insert(jobRun).values({
      jobKey: "open_guest_windows",
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
