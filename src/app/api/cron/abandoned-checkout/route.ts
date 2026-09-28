import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { booking, event, person, jobRun, auditLog } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { verifyCronAuth } from "@/lib/cron-auth";
import { queueAndSendEmail } from "@/lib/brevo";

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const startedAt = new Date();
  let remindersSent = 0;
  let holdsCleaned = 0;

  try {
    // 1. Release all expired held bookings where held_until <= NOW()
    const expiredHolds = await db
      .select({
        id: booking.id,
        eventId: booking.eventId,
        personId: booking.personId,
        heldUntil: booking.heldUntil,
      })
      .from(booking)
      .where(
        and(
          eq(booking.status, "held"),
          sql`held_until IS NOT NULL AND held_until <= NOW()`
        )
      );

    for (const hold of expiredHolds) {
      await db
        .update(booking)
        .set({ status: "released", releasedAt: new Date(), cancelledAt: new Date(), updatedAt: new Date() })
        .where(eq(booking.id, hold.id));
      holdsCleaned++;
    }

    // 2. Check for abandoned bookings created 1-2 hours ago to send a gentle reminder
    const abandonedCandidates = await db
      .select({
        bookingId: booking.id,
        personId: booking.personId,
        eventId: booking.eventId,
        createdAt: booking.createdAt,
      })
      .from(booking)
      .innerJoin(event, eq(booking.eventId, event.id))
      .where(
        and(
          eq(booking.status, "released"),
          sql`${booking.releasedAt} IS NOT NULL`,
          sql`${booking.createdAt} >= NOW() - INTERVAL '24 hours'`,
          sql`${booking.createdAt} <= NOW() - INTERVAL '30 minutes'`
        )
      );

    await db.insert(jobRun).values({
      jobKey: "abandoned_checkout_cleaner",
      outcome: "success",
      startedAt,
      finishedAt: new Date(),
      counts: { holdsCleaned, remindersSent },
    });

    return NextResponse.json({
      success: true,
      holdsCleaned,
      remindersSent,
    });
  } catch (error: any) {
    await db.insert(jobRun).values({
      jobKey: "abandoned_checkout_cleaner",
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
