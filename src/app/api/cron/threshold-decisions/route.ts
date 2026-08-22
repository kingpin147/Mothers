import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { event, booking, jobRun } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const startedAt = new Date();
  let affectedEvents = 0;

  try {
    // Fetch events needing threshold confirmation at T-7 days (§7.2, §17)
    const pendingEvents = await db
      .select()
      .from(event)
      .where(
        and(
          eq(event.status, "published_pending"),
          sql`starts_at <= NOW() + INTERVAL '7 days'`
        )
      );

    for (const ev of pendingEvents) {
      const counts = await db
        .select({ count: sql<number>`count(*)` })
        .from(booking)
        .where(
          and(
            eq(booking.eventId, ev.id),
            eq(booking.kind, "member"),
            sql`status IN ('held', 'confirmed')`
          )
        );

      const activeBookings = Number(counts[0]?.count || 0);

      // Auto-confirm if threshold is reached
      if (activeBookings >= ev.minToConfirm) {
        await db.transaction(async (tx) => {
          await tx
            .update(event)
            .set({
              status: "confirmed",
              confirmedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(event.id, ev.id));

          await tx
            .update(booking)
            .set({
              status: "confirmed",
              updatedAt: new Date(),
            })
            .where(and(eq(booking.eventId, ev.id), eq(booking.status, "held")));
        });
        affectedEvents++;
      }
    }

    // Log job run (§17)
    await db.insert(jobRun).values({
      jobKey: "threshold_decisions",
      outcome: "success",
      startedAt,
      finishedAt: new Date(),
      counts: { pendingEvaluated: pendingEvents.length, autoConfirmed: affectedEvents },
    });

    return NextResponse.json({ success: true, evaluated: pendingEvents.length, autoConfirmed: affectedEvents });
  } catch (error: any) {
    await db.insert(jobRun).values({
      jobKey: "threshold_decisions",
      outcome: "failed",
      startedAt,
      finishedAt: new Date(),
      error: error?.message || "Unknown error",
    });

    return NextResponse.json({ error: error?.message || "CRON_FAILED" }, { status: 500 });
  }
}
